<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\MerchantProviderCredential;
use App\Models\PaymentRoutingAttempt;
use App\Models\ProviderHealthStatus;
use App\Models\ProviderRoutingConfiguration;
use App\Models\ProviderRoutingRule;
use App\Models\RoutingWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class RoutingController extends Controller
{
    public function index(): Response
    {
        $merchantId = Auth::id();

        $workflows = RoutingWorkflow::query()
            ->where('merchant_id', $merchantId)
            ->with(['versions' => fn ($q) => $q->orderByDesc('version')->limit(5)])
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn ($w) => [
                'id'               => $w->id,
                'name'             => $w->name,
                'environment'      => $w->environment,
                'status'           => $w->status,
                'current_version'  => $w->current_version,
                'nodes'            => $w->nodes ?? [],
                'edges'            => $w->edges ?? [],
                'canvas_layout'    => $w->canvas_layout ?? [],   // ← saved node positions
                'validation_errors'=> $w->validation_errors ?? [],
                'published_at'     => $w->published_at?->toIso8601String(),
                'updated_at'       => $w->updated_at->toIso8601String(),
                'versions'         => $w->versions->map(fn ($v) => [
                    'id'           => $v->id,
                    'version'      => $v->version,
                    'status'       => $v->status,
                    'published_at' => $v->published_at?->toIso8601String(),
                    'created_at'   => $v->created_at?->toIso8601String(),
                ])->values(),
            ]);

        $health = ProviderHealthStatus::query()
            ->where('merchant_id', $merchantId)
            ->get()
            ->map(fn ($h) => [
                'provider_alias'       => $h->provider_alias,
                'environment'          => $h->environment,
                'status'               => $h->status,
                'consecutive_failures' => $h->consecutive_failures,
                'failure_rate'         => (float) $h->failure_rate,
                'disabled_until'       => $h->disabled_until?->toIso8601String(),
                'last_success_at'      => $h->last_success_at?->toIso8601String(),
                'last_failure_at'      => $h->last_failure_at?->toIso8601String(),
                'last_error'           => $h->last_error,
            ]);

        $attempts = PaymentRoutingAttempt::query()
            ->where('merchant_id', $merchantId)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn ($a) => [
                'id'             => $a->id,
                'payment_id'     => $a->payment_id,
                'environment'    => $a->environment,
                'provider_alias' => $a->provider_alias,
                'strategy'       => $a->strategy,
                'attempt_number' => $a->attempt_number,
                'status'         => $a->status,
                'latency_ms'     => $a->latency_ms,
                'error_code'     => $a->error_code,
                'error_message'  => $a->error_message,
                'created_at'     => $a->created_at?->toIso8601String(),
            ]);

        $trafficAgg = PaymentRoutingAttempt::query()
            ->where('merchant_id', $merchantId)
            ->selectRaw("environment, provider_alias, COUNT(*) as total, SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as succeeded, COALESCE(ROUND(AVG(latency_ms)), 0) as avg_latency_ms")
            ->groupBy('environment', 'provider_alias')
            ->get();

        $grandTotal = $trafficAgg->sum('total');

        $trafficSplit = $trafficAgg
            ->groupBy('environment')
            ->map(function ($rows, string $environment) {
                $environmentTotal = $rows->sum('total');

                return [
                    'environment' => $environment,
                    'total' => (int) $environmentTotal,
                    'providers' => $rows->map(fn ($r) => [
                        'provider_alias' => $r->provider_alias,
                        'total'          => (int) $r->total,
                        'succeeded'      => (int) $r->succeeded,
                        'failed'         => (int) $r->total - (int) $r->succeeded,
                        'pct'            => $environmentTotal > 0 ? round(($r->total / $environmentTotal) * 100, 1) : 0.0,
                        'success_rate'   => $r->total > 0 ? round(($r->succeeded / $r->total) * 100, 1) : 0.0,
                        'avg_latency_ms' => (int) $r->avg_latency_ms ?: null,
                    ])->sortByDesc('total')->values(),
                ];
            })
            ->sortBy(fn ($row) => $row['environment'] === 'live' ? 0 : 1)
            ->values();

        $configurations = ProviderRoutingConfiguration::query()
            ->where('merchant_id', $merchantId)
            ->get()
            ->map(fn ($c) => [
                'environment'           => $c->environment,
                'strategy'              => $c->strategy,
                'enabled'               => $c->enabled,
                'priority_chain'        => $c->priority_chain ?? [],
                'failover_chain'        => $c->failover_chain ?? [],
                'weighted_distribution' => $c->weighted_distribution ?? [],
            ]);

        $rules = ProviderRoutingRule::query()
            ->where('merchant_id', $merchantId)
            ->orderBy('priority')
            ->get()
            ->map(fn ($r) => [
                'id'             => $r->id,
                'name'           => $r->name,
                'environment'    => $r->environment,
                'provider_alias' => $r->provider_alias,
                'priority'       => $r->priority,
                'enabled'        => $r->enabled,
                'conditions'     => $r->conditions ?? [],
            ]);

        $credentials = MerchantProviderCredential::query()
            ->where('merchant_id', $merchantId)
            ->with('provider:id,name,alias')
            ->get()
            ->map(fn ($c) => [
                'provider_alias' => $c->provider?->alias,
                'provider_name'  => $c->provider?->name,
                'environment'    => $c->environment,
                'display_name'   => $c->display_name,
                'status'         => $c->status,
                'public_key'     => $c->maskedPublicKey(),
                'has_secret'     => $c->hasSecret(),
                'last_validated_at' => $c->last_validated_at?->toIso8601String(),
            ]);

        return Inertia::render('Routing/Index', [
            'workflows'      => $workflows,
            'health'         => $health,
            'attempts'       => $attempts,
            'configurations' => $configurations,
            'rules'          => $rules,
            'credentials'    => $credentials,
            'trafficSplit'   => $trafficSplit,
            'summary'        => [
                'unhealthy_providers'  => $health->whereIn('status', ['unhealthy', 'disabled'])->count(),
                'published_workflows'  => $workflows->where('status', 'published')->count(),
                'failed_attempts'      => (int) $trafficAgg->sum('total') - (int) $trafficAgg->sum('succeeded'),
                'total_attempts'       => (int) $grandTotal,
            ],
        ]);
    }

    /**
     * Full-screen read-only visual builder page for a single workflow.
     */
    public function builder(string $workflow): Response
    {
        $merchantId = Auth::id();

        $wf = RoutingWorkflow::query()
            ->where('id', $workflow)
            ->where('merchant_id', $merchantId)
            ->with(['versions' => fn ($q) => $q->orderByDesc('version')->limit(10)])
            ->firstOrFail();

        return Inertia::render('Routing/Builder', [
            'workflow' => [
                'id'              => $wf->id,
                'name'            => $wf->name,
                'environment'     => $wf->environment,
                'status'          => $wf->status,
                'current_version' => $wf->current_version,
                'nodes'           => $wf->nodes ?? [],
                'edges'           => $wf->edges ?? [],
                'canvas_layout'   => $wf->canvas_layout ?? [],
                'published_at'    => $wf->published_at?->toIso8601String(),
                'updated_at'      => $wf->updated_at->toIso8601String(),
                'versions'        => $wf->versions->map(fn ($v) => [
                    'id'          => $v->id,
                    'version'     => $v->version,
                    'status'      => $v->status,
                    'published_at'=> $v->published_at?->toIso8601String(),
                    'created_at'  => $v->created_at?->toIso8601String(),
                ])->values(),
            ],
        ]);
    }

    /**
     * Persist the merchant's visual canvas layout for a workflow.
     *
     * Accepts: { layout: { [nodeId]: { x: number, y: number } } }
     * Only updates canvas_layout — routing logic (nodes/edges) is never touched.
     */
    public function saveCanvasLayout(Request $request, string $workflow): JsonResponse
    {
        $merchantId = Auth::id();

        $wf = RoutingWorkflow::query()
            ->where('id', $workflow)
            ->where('merchant_id', $merchantId)
            ->firstOrFail();

        $validated = $request->validate([
            'layout'          => ['required', 'array'],
            'layout.*'        => ['required', 'array'],
            'layout.*.x'      => ['required', 'numeric'],
            'layout.*.y'      => ['required', 'numeric'],
        ]);

        $wf->update(['canvas_layout' => $validated['layout']]);

        return response()->json(['saved' => true]);
    }
}
