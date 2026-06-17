<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\ApiKeys\ApiKeyRepositoryInterface;
use App\Enums\MerchantAPIKeyStatus;
use App\Models\MerchantApiKey;
use Illuminate\Pagination\LengthAwarePaginator;

class ApiKeyService
{
    public function __construct(
        private readonly ApiKeyRepositoryInterface $apiKeyRepositoryInterface,
        private readonly GatewayAccessProfileService $gatewayAccessProfileService,
    ) {}

    public function fetchAll($params = []): LengthAwarePaginator
    {
        $perPage = $params['per_page'];

        return $this->apiKeyRepositoryInterface->fetchAll($params)
            ->latest('id')
            ->paginate($perPage);
    }

    public function generateForMerchant(string $merchantId, string $environment = 'test'): string
    {
        $prefix       = $environment === 'live' ? 'pgw_live_' : 'pgw_test_';
        $plainTextKey = $prefix . bin2hex(random_bytes(24));
        $keyPrefix    = substr($plainTextKey, 0, 13);
        $hash         = hash_hmac('sha256', $plainTextKey, config('services.gateway.hmac_secret'));

        \Illuminate\Support\Facades\DB::transaction(function () use ($merchantId, $environment, $hash, $keyPrefix, &$newKey) {
            // Enforce one active key per merchant per environment:
            // revoke every currently active key before issuing the new one.
            $this->revokeActiveKeys($merchantId, $environment);

            $newKey = MerchantApiKey::create([
                'merchant_id' => $merchantId,
                'hash'        => $hash,
                'key_prefix'  => $keyPrefix,
                'environment' => $environment,
                'status'      => MerchantAPIKeyStatus::ACTIVE,
            ]);

            $this->gatewayAccessProfileService->syncApiKey($newKey);
        });

        return $plainTextKey;
    }

    /**
     * Push a single already-revoked key's status to the gateway / Redis cache.
     * Called by the controller after an explicit manual revocation.
     */
    public function syncRevokedKey(MerchantApiKey $key): void
    {
        $this->gatewayAccessProfileService->syncApiKey($key);
    }

    /**
     * Revoke all active API keys for a given merchant + environment.
     * Each revoked key is synced to the gateway so the Redis cache is
     * invalidated immediately — no grace window, no stale credentials.
     */
    private function revokeActiveKeys(string $merchantId, string $environment): void
    {
        MerchantApiKey::query()
            ->where('merchant_id', $merchantId)
            ->where('environment', $environment)
            ->where('status', MerchantAPIKeyStatus::ACTIVE)
            ->get()
            ->each(function (MerchantApiKey $key) {
                $key->update([
                    'status'     => MerchantAPIKeyStatus::INACTIVE,
                    'revoked_at' => now(),
                ]);

                // Push the revocation to the gateway profile + Redis immediately.
                $this->gatewayAccessProfileService->syncApiKey($key);
            });
    }
}
