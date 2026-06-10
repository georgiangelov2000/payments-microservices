<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Routing\RoutingRepositoryInterface;
use App\Models\ProviderRoutingConfiguration;
use App\Models\RoutingWorkflow;
use App\Models\RoutingWorkflowVersion;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

final class RoutingWorkflowService
{
    public function __construct(
        private readonly RoutingRepositoryInterface $routingRepository,
    ) {}

    /**
     * Create or update the workflow for a given merchant + environment pair.
     *
     * Exactly one workflow is allowed per (merchant_id, environment). If one
     * already exists it is updated in-place (upsert); otherwise a new row is
     * created. This mirrors the DB-level partial unique index.
     */
    public function createWorkflow(array $data): RoutingWorkflow
    {
        $existing = RoutingWorkflow::query()
            ->where('merchant_id', $data['merchant_id'])
            ->where('environment', $data['environment'])
            ->first();

        if ($existing !== null) {
            return $this->updateWorkflow($existing, $data);
        }

        $workflow = $this->routingRepository->createWorkflow([
            'merchant_id' => $data['merchant_id'],
            'name' => $data['name'],
            'environment' => $data['environment'],
            'status' => 'draft',
            'current_version' => 1,
            'nodes' => $this->normalizeNodes($data['nodes'] ?? []),
            'edges' => $this->normalizeEdges($data['edges'] ?? []),
            'validation_errors' => [],
            'created_by' => Auth::id(),
            'updated_by' => Auth::id(),
        ]);

        $this->snapshot($workflow, 'draft');
        $this->audit('workflow.created', $workflow, null, $workflow->toArray());

        return $workflow;
    }

    public function updateWorkflow(RoutingWorkflow $workflow, array $data): RoutingWorkflow
    {
        $before = $workflow->toArray();
        $nodes = $this->normalizeNodes($data['nodes'] ?? $workflow->nodes ?? []);
        $edges = $this->normalizeEdges($data['edges'] ?? $workflow->edges ?? []);
        $validationErrors = $this->validateWorkflow($nodes, $edges);

        $updated = $this->routingRepository->updateWorkflow($workflow, [
            'name' => $data['name'] ?? $workflow->name,
            'environment' => $data['environment'] ?? $workflow->environment,
            'status' => $workflow->status === 'published' ? 'draft' : $workflow->status,
            'nodes' => $nodes,
            'edges' => $edges,
            'validation_errors' => $validationErrors,
            'updated_by' => Auth::id(),
        ]);

        $this->audit('workflow.updated', $updated, $before, $updated->toArray());

        return $updated;
    }

    public function publishWorkflow(RoutingWorkflow $workflow): RoutingWorkflow
    {
        $nodes = $workflow->nodes ?: [];
        $edges = $workflow->edges ?: [];
        $validationErrors = $this->validateWorkflow($nodes, $edges);

        if ($validationErrors !== []) {
            $workflow->update(['validation_errors' => $validationErrors]);
            throw new \DomainException(implode(' ', $validationErrors));
        }

        DB::transaction(function () use ($workflow, $nodes, $edges) {
            $before = $workflow->toArray();

            $workflow->update([
                'status' => 'published',
                'current_version' => $workflow->current_version + 1,
                'validation_errors' => [],
                'published_by' => Auth::id(),
                'published_at' => now(),
            ]);

            $workflow->refresh();
            $this->snapshot($workflow, 'published');
            $this->syncRoutingConfiguration($workflow, $nodes, $edges);
            $this->audit('workflow.published', $workflow, $before, $workflow->toArray());
        });

        return $workflow->fresh();
    }

    public function rollbackWorkflow(RoutingWorkflow $workflow, RoutingWorkflowVersion $version): RoutingWorkflow
    {
        abort_unless($version->workflow_id === $workflow->id, 404);

        DB::transaction(function () use ($workflow, $version) {
            $before = $workflow->toArray();

            $workflow->update([
                'status' => 'draft',
                'current_version' => $workflow->current_version + 1,
                'nodes' => $version->nodes ?: [],
                'edges' => $version->edges ?: [],
                'validation_errors' => $version->validation_errors ?: [],
                'updated_by' => Auth::id(),
            ]);

            $workflow->refresh();
            $this->snapshot($workflow, 'draft');
            $this->audit('workflow.rollback', $workflow, $before, [
                'rolled_back_to_version' => $version->version,
                'workflow' => $workflow->toArray(),
            ]);
        });

        return $workflow->fresh();
    }

    public function simulate(array $nodes, array $edges, array $input): array
    {
        $nodeMap = collect($nodes)->keyBy('id')->all();
        $adj = [];
        foreach ($edges as $e) {
            $adj[$e['source']][] = ['target' => $e['target'], 'handle' => $e['sourceHandle'] ?? null];
        }

        $start = collect($nodes)->firstWhere('type', 'start');
        if (! $start) {
            return ['outcome' => 'error', 'error' => 'No start node found', 'path' => []];
        }

        $path = [];
        $current = $start;
        $steps = 0;

        while ($current && $steps++ < 30) {
            $type = $current['type'] ?? 'unknown';
            $data = $current['data'] ?? [];
            $id = $current['id'];
            $outgoing = $adj[$id] ?? [];

            $step = ['node_id' => $id, 'type' => $type, 'label' => $data['label'] ?? $type, 'decision' => null];

            if ($type === 'success') {
                $step['decision'] = 'Payment routed successfully';
                $path[] = $step;
                break;
            }
            if ($type === 'failure') {
                $step['decision'] = 'Payment routing failed';
                $path[] = $step;
                break;
            }

            if ($type === 'provider') {
                $alias = $data['provider_alias'] ?? 'unknown';
                $step['decision'] = "Route to {$alias}";
                $step['provider'] = $alias;
                $path[] = $step;
                $next = collect($outgoing)->firstWhere('handle', 'success') ?? $outgoing[0] ?? null;
                $current = $next ? ($nodeMap[$next['target']] ?? null) : null;

                continue;
            }

            if ($type === 'condition') {
                $matches = $this->evaluateConditions($data['conditions'] ?? [], $input);
                $handle = $matches ? 'yes' : 'no';
                $step['decision'] = $matches ? '✓ Condition matched → yes' : '✗ No match → no';
                $path[] = $step;
                $next = collect($outgoing)->firstWhere('handle', $handle) ?? $outgoing[0] ?? null;
                $current = $next ? ($nodeMap[$next['target']] ?? null) : null;

                continue;
            }

            if ($type === 'weighted') {
                $dist = $data['distribution'] ?? [];
                $provider = $this->pickWeighted($dist, $input);
                $step['decision'] = "Weighted selection → {$provider}";
                $step['provider'] = $provider;
                $path[] = $step;
                $next = $outgoing[0] ?? null;
                $current = $next ? ($nodeMap[$next['target']] ?? null) : null;

                continue;
            }

            if ($type === 'failover') {
                $chain = $data['chain'] ?? [];
                $primary = $chain[0] ?? 'unknown';
                $step['decision'] = 'Failover primary: '.$primary.(count($chain) > 1 ? ' → '.implode(' → ', array_slice($chain, 1)) : '');
                $step['provider'] = $primary;
                $path[] = $step;
                $next = $outgoing[0] ?? null;
                $current = $next ? ($nodeMap[$next['target']] ?? null) : null;

                continue;
            }

            // start / unknown — just follow first edge
            $path[] = $step;
            $next = $outgoing[0] ?? null;
            $current = $next ? ($nodeMap[$next['target']] ?? null) : null;
        }

        $last = end($path) ?: [];
        $outcome = $last['type'] ?? 'incomplete';

        return ['outcome' => $outcome, 'path' => $path];
    }

    private function evaluateConditions(array $conditions, array $input): bool
    {
        foreach ($conditions as $cond) {
            $field = $cond['field'] ?? null;
            $operator = $cond['operator'] ?? 'eq';
            $expected = $cond['value'] ?? null;
            $actual = $input[$field] ?? null;

            if (! $field || $expected === null || $expected === '') {
                continue;
            }

            $match = match ($operator) {
                'eq' => strtolower((string) $actual) === strtolower((string) $expected),
                'neq' => strtolower((string) $actual) !== strtolower((string) $expected),
                'in' => in_array(strtolower((string) $actual), array_map('strtolower', (array) $expected), true),
                'gt' => (float) $actual > (float) $expected,
                'lt' => (float) $actual < (float) $expected,
                'gte' => (float) $actual >= (float) $expected,
                'lte' => (float) $actual <= (float) $expected,
                default => false,
            };

            if (! $match) {
                return false;
            }
        }

        return true;
    }

    private function pickWeighted(array $dist, array $input): string
    {
        if (empty($dist)) {
            return 'unknown';
        }
        $token = ($input['price'] ?? '').':'.($input['country'] ?? '');
        $hash = abs(crc32($token));
        $bucket = $hash % 100;
        $cursor = 0;
        foreach ($dist as $entry) {
            $cursor += (int) ($entry['weight'] ?? 0);
            if ($bucket < $cursor) {
                return $entry['provider_alias'] ?? 'unknown';
            }
        }

        return $dist[0]['provider_alias'] ?? 'unknown';
    }

    public function validateWorkflow(array $nodes, array $edges): array
    {
        $errors = [];
        $nodeIds = collect($nodes)->pluck('id')->all();
        $nodesById = collect($nodes)->keyBy('id');

        // Require a start node
        $startCount = collect($nodes)->where('type', 'start')->count();
        if ($startCount === 0) {
            $errors[] = 'Workflow must have a Start node.';
        } elseif ($startCount > 1) {
            $errors[] = 'Workflow can only have one Start node.';
        }

        // Require at least one terminal node
        $terminals = collect($nodes)->whereIn('type', ['success', 'failure'])->count();
        if ($terminals === 0) {
            $errors[] = 'Workflow must have at least one Success or Failure node.';
        }

        // Provider nodes must select a provider
        foreach ($nodes as $node) {
            if (($node['type'] ?? '') !== 'provider') {
                continue;
            }
            $data = $node['data'] ?? $node;
            $alias = $data['provider_alias'] ?? null;
            $label = $data['label'] ?? 'Provider';
            if (blank($alias)) {
                $errors[] = "Provider node '{$label}' must have a provider selected.";
            }
        }

        // Edges must reference real nodes
        foreach ($edges as $edge) {
            if (! in_array($edge['source'], $nodeIds, true) || ! in_array($edge['target'], $nodeIds, true)) {
                $errors[] = 'Every workflow edge must reference existing nodes.';
                break;
            }

            $source = $nodesById[$edge['source']] ?? null;
            $target = $nodesById[$edge['target']] ?? null;

            if ($source && $target) {
                $errors = array_merge($errors, $this->validateEdgeLogic($source, $target, $edge));
            }
        }

        // Weighted nodes must sum to 100 %
        foreach ($nodes as $node) {
            if (($node['type'] ?? '') !== 'weighted') {
                continue;
            }
            $data = $node['data'] ?? $node;
            $label = $data['label'] ?? 'Weighted';
            $dist = $data['distribution'] ?? [];
            if (! empty($dist)) {
                $total = (int) array_sum(array_column($dist, 'weight'));
                if ($total !== 100) {
                    $errors[] = "Weighted node '{$label}' distribution must sum to 100% (currently {$total}%).";
                }
            }
        }

        return array_values(array_unique($errors));
    }

    private function validateEdgeLogic(array $source, array $target, array $edge): array
    {
        $errors = [];
        $sourceType = $source['type'] ?? null;
        $targetType = $target['type'] ?? null;
        $sourceLabel = $source['data']['label'] ?? $sourceType ?? 'Source';
        $targetLabel = $target['data']['label'] ?? $targetType ?? 'Target';
        $condition = strtolower((string) ($edge['condition'] ?? $edge['label'] ?? $edge['sourceHandle'] ?? 'default'));

        $failureConditions = ['failed', 'failure', 'timeout', 'declined', 'error', 'no'];
        $successConditions = ['success', 'succeeded', 'yes'];

        if ($sourceType === 'success') {
            $errors[] = "Success node '{$sourceLabel}' cannot route to another node.";
        }

        if ($sourceType === 'failure') {
            $errors[] = "Failure node '{$sourceLabel}' cannot route to another node.";
        }

        if ($sourceType === 'start' && in_array($condition, $failureConditions, true)) {
            $errors[] = "Start node '{$sourceLabel}' cannot use a {$condition} edge. Route the payment request with a normal/default edge.";
        }

        if ($targetType === 'success' && in_array($condition, $failureConditions, true)) {
            $errors[] = "Failure or timeout edge from '{$sourceLabel}' cannot route directly to Success.";
        }

        if ($targetType === 'failure' && in_array($condition, $successConditions, true)) {
            $errors[] = "Success edge from '{$sourceLabel}' cannot route directly to Failure.";
        }

        if ($sourceType === 'provider' && $targetType === 'provider' && in_array($condition, $successConditions, true)) {
            $errors[] = "Success edge from provider '{$sourceLabel}' should route to Success, not another provider.";
        }

        if ($sourceType === 'provider' && $targetType === 'success' && ! in_array($condition, $successConditions, true)) {
            $errors[] = "Provider '{$sourceLabel}' may route to Success only through a success edge.";
        }

        return $errors;
    }

    public function serializeWorkflow(RoutingWorkflow $workflow): array
    {
        return [
            'id' => $workflow->id,
            'merchant_id' => $workflow->merchant_id,
            'merchant' => $workflow->merchant ? [
                'name' => $workflow->merchant->name,
                'email' => $workflow->merchant->email,
            ] : null,
            'name' => $workflow->name,
            'environment' => $workflow->environment,
            'status' => $workflow->status,
            'current_version' => $workflow->current_version,
            'nodes' => $workflow->nodes ?: [],
            'edges' => $workflow->edges ?: [],
            'validation_errors' => $workflow->validation_errors ?: [],
            'published_at' => $workflow->published_at?->toDateTimeString(),
            'updated_at' => $workflow->updated_at?->toDateTimeString(),
            'versions' => $workflow->versions->map(fn (RoutingWorkflowVersion $version) => [
                'id' => $version->id,
                'version' => $version->version,
                'status' => $version->status,
                'published_at' => $version->published_at?->toDateTimeString(),
                'created_at' => $version->created_at?->toDateTimeString(),
            ]),
        ];
    }

    private function normalizeNodes(array $nodes): array
    {
        return collect($nodes)->map(function (array $node, int $index) {
            // Support both React Flow format (data wrapper) and legacy flat format.
            $raw = $node['data'] ?? $node;

            return [
                'id' => $node['id'] ?? ('node-'.($index + 1)),
                'type' => $node['type'] ?? 'provider',
                // Preserve canvas position so the builder can restore layout.
                'position' => $node['position'] ?? ['x' => ($index % 3) * 240 + 60, 'y' => intdiv($index, 3) * 200 + 80],
                'data' => [
                    'label' => $raw['label'] ?? 'Provider',
                    'provider_alias' => $raw['provider_alias'] ?? null,
                    'enabled' => (bool) ($raw['enabled'] ?? true),
                    'weight' => max(0, min(100, (int) ($raw['weight'] ?? 0))),
                    'priority' => max(1, (int) ($raw['priority'] ?? ($index + 1))),
                    'conditions' => $raw['conditions'] ?? [],
                    'distribution' => $raw['distribution'] ?? [],
                    'chain' => $raw['chain'] ?? [],
                ],
            ];
        })->values()->all();
    }

    private function normalizeEdges(array $edges): array
    {
        return collect($edges)->map(fn (array $edge, int $index) => [
            'id' => $edge['id'] ?? ('edge-'.($index + 1)),
            'source' => $edge['source'] ?? null,
            'target' => $edge['target'] ?? null,
            'sourceHandle' => $edge['sourceHandle'] ?? null,
            'label' => $edge['label'] ?? null,
            'style' => $edge['style'] ?? [],
            'markerEnd' => $edge['markerEnd'] ?? null,
            // Business-logic alias used by buildFailoverChain
            'condition' => $edge['condition'] ?? $edge['sourceHandle'] ?? 'default',
        ])->values()->all();
    }

    private function snapshot(RoutingWorkflow $workflow, string $status): void
    {
        $this->routingRepository->createVersion([
            'workflow_id' => $workflow->id,
            'version' => $workflow->current_version,
            'status' => $status,
            'nodes' => $workflow->nodes ?: [],
            'edges' => $workflow->edges ?: [],
            'validation_errors' => $workflow->validation_errors ?: [],
            'created_by' => Auth::id(),
            'published_at' => $status === 'published' ? now() : null,
        ]);
    }

    private function syncRoutingConfiguration(RoutingWorkflow $workflow, array $nodes, array $edges): void
    {
        $providers = collect($nodes)
            ->where('type', 'provider')
            ->filter(fn ($n) => (bool) ($n['data']['enabled'] ?? true))
            ->sortBy(fn ($n) => (int) ($n['data']['priority'] ?? 99))
            ->values();

        $priorityChain = $providers->map(fn ($n) => $n['data']['provider_alias'] ?? null)->filter()->values()->all();
        $weightedDistribution = $providers
            ->filter(fn ($n) => (int) ($n['data']['weight'] ?? 0) > 0)
            ->mapWithKeys(fn ($n) => [$n['data']['provider_alias'] => (int) $n['data']['weight']])
            ->all();

        // Check if any weighted node exists in the workflow
        $hasWeighted = collect($nodes)->where('type', 'weighted')->isNotEmpty();

        ProviderRoutingConfiguration::query()->updateOrCreate(
            ['merchant_id' => $workflow->merchant_id, 'environment' => $workflow->environment],
            [
                'strategy' => ($hasWeighted || $weightedDistribution !== []) ? 'weighted' : 'priority',
                'enabled' => true,
                'priority_chain' => $priorityChain,
                'failover_chain' => $this->buildFailoverChain($nodes, $edges, $priorityChain),
                'weighted_distribution' => $weightedDistribution,
                'metadata' => [
                    'workflow_id' => $workflow->id,
                    'workflow_version' => $workflow->current_version,
                    'conditions' => $providers->mapWithKeys(fn ($n) => [$n['data']['provider_alias'] => $n['data']['conditions'] ?? []])->all(),
                ],
            ]
        );
    }

    private function buildFailoverChain(array $nodes, array $edges, array $fallback): array
    {
        $nodeAliases = collect($nodes)->keyBy('id')
            ->map(fn ($n) => $n['data']['provider_alias'] ?? null);

        $chain = collect($edges)
            ->whereIn('condition', ['failed', 'failure'])
            ->map(fn ($e) => $nodeAliases[$e['target']] ?? null)
            ->filter()
            ->values()
            ->all();

        return $chain === [] ? $fallback : array_values(array_unique($chain));
    }

    private function audit(string $action, RoutingWorkflow $workflow, ?array $before, array $after): void
    {
        $this->routingRepository->createAuditLog([
            'actor_id' => Auth::id(),
            'merchant_id' => $workflow->merchant_id,
            'actor_type' => 'admin',
            'action' => $action,
            'subject_type' => RoutingWorkflow::class,
            'subject_id' => $workflow->id,
            'before' => $before,
            'after' => $after,
        ]);
    }
}
