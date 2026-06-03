<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Provider;
use App\Models\ProviderRoutingConfiguration;
use App\Models\RoutingAuditLog;
use Illuminate\Database\Eloquent\Collection;

final class RoutingService
{
    /**
     * Return the providers available to a merchant in a given environment.
     * Falls back to all providers when the merchant has no credentials yet.
     */
    public function getAvailableProviders(string $merchantId, string $environment): Collection
    {
        $providers = Provider::query()
            ->join('merchant_provider_credentials', 'merchant_provider_credentials.provider_id', '=', 'providers.id')
            ->where('merchant_provider_credentials.merchant_id', $merchantId)
            ->where('merchant_provider_credentials.environment', $environment)
            ->whereIn('merchant_provider_credentials.status', ['active', 'validated', 'pending'])
            ->select('providers.id', 'providers.name', 'providers.alias')
            ->orderBy('providers.name')
            ->get();

        return $providers->isNotEmpty()
            ? $providers
            : Provider::query()->select('id', 'name', 'alias')->orderBy('name')->get();
    }

    /**
     * Distribute 100 % evenly across aliases, assigning any remainder to the first entry.
     *
     * @param  string[]  $aliases
     * @return array<string, int>
     */
    public function defaultWeights(array $aliases): array
    {
        if ($aliases === []) {
            return [];
        }

        $weight = intdiv(100, count($aliases));
        $weights = array_fill_keys($aliases, $weight);
        $weights[$aliases[0]] += 100 - array_sum($weights);

        return $weights;
    }

    /**
     * Remove any aliases that are not in the allowed list, re-indexing the result.
     *
     * @param  string[]  $aliases
     * @param  string[]  $allowed
     * @return string[]
     */
    public function filterAliases(array $aliases, array $allowed): array
    {
        return array_values(array_filter($aliases, fn (string $alias) => in_array($alias, $allowed, true)));
    }

    /**
     * Persist a routing audit log entry.
     */
    public function recordAudit(
        ?string $actorId,
        ?string $merchantId,
        string $action,
        object $subject,
        ?array $before,
    ): void {
        RoutingAuditLog::query()->create([
            'actor_id' => $actorId,
            'merchant_id' => $merchantId,
            'actor_type' => 'merchant',
            'action' => $action,
            'subject_type' => $subject::class,
            'subject_id' => $subject->id ?? null,
            'before' => $before,
            'after' => method_exists($subject, 'fresh') ? $subject->fresh()?->toArray() : null,
        ]);
    }

    /**
     * Fetch or create a ProviderRoutingConfiguration for the given merchant/environment,
     * initialising it from the available providers when first created.
     */
    public function getOrCreateConfiguration(string $merchantId, string $environment): ProviderRoutingConfiguration
    {
        $providers = $this->getAvailableProviders($merchantId, $environment);
        $aliases = $providers->pluck('alias')->values()->all();

        return ProviderRoutingConfiguration::query()->firstOrCreate(
            ['merchant_id' => $merchantId, 'environment' => $environment],
            [
                'strategy' => 'priority',
                'enabled' => true,
                'priority_chain' => $aliases,
                'failover_chain' => $aliases,
                'weighted_distribution' => $this->defaultWeights($aliases),
                'metadata' => [],
            ]
        );
    }
}
