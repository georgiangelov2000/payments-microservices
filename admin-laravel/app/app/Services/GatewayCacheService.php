<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Tells the gateway-verification service to evict a specific API key from
 * its Redis auth cache. Called after key revocation or suspension so that
 * the 15-minute cache TTL is not honoured for keys that are no longer valid.
 */
final class GatewayCacheService
{
    public function invalidateApiKeyHash(string $hash): void
    {
        $url = config('services.gateway.verification_url');
        $secret = config('services.gateway.internal_secret');

        if (! $url || ! $secret) {
            Log::warning('GatewayCacheService: GATEWAY_VERIFICATION_URL or GATEWAY_INTERNAL_SECRET not configured — cache not invalidated for hash ' . $hash);
            return;
        }

        try {
            Http::withToken($secret)
                ->timeout(3)
                ->post("{$url}/internal/cache/invalidate", [
                    'api_key_hash' => $hash,
                ]);
        } catch (\Throwable $e) {
            // Cache invalidation is best-effort — a gateway restart or Redis flush
            // will also evict the entry. Log but do not surface to the caller.
            Log::warning('GatewayCacheService: failed to invalidate gateway cache', [
                'hash' => $hash,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
