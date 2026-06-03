<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\MerchantAPIKeyStatus;
use App\Enums\Role;
use App\Enums\SubscriptionStatus;
use App\Models\GatewayAccessProfile;
use App\Models\MerchantApiKey;
use App\Models\Provider;
use App\Models\UserSubscription;
use Illuminate\Support\Facades\Redis;
use Throwable;

class GatewayAccessProfileService
{
    private const CACHE_PREFIX = 'gateway:auth:v1:';

    private const CACHE_TTL_SECONDS = 900;

    public function syncForMerchant(string $merchantId): void
    {
        $providers = $this->loadProviders();

        MerchantApiKey::query()
            ->where('merchant_id', $merchantId)
            ->with('merchant')
            ->get()
            ->each(fn (MerchantApiKey $apiKey) => $this->syncApiKey($apiKey, $providers));
    }

    public function syncAll(): void
    {
        $providers = $this->loadProviders();

        MerchantApiKey::query()
            ->with('merchant')
            ->orderBy('id')
            ->chunkById(100, function ($apiKeys) use ($providers) {
                $apiKeys->each(fn (MerchantApiKey $apiKey) => $this->syncApiKey($apiKey, $providers));
            });
    }

    public function syncApiKey(MerchantApiKey $apiKey, ?array $providers = null): ?GatewayAccessProfile
    {
        $providers ??= $this->loadProviders();

        $apiKey->loadMissing('merchant');
        $merchant = $apiKey->merchant;

        if (! $merchant) {
            $this->invalidate($apiKey->hash);
            GatewayAccessProfile::query()->where('api_key_hash', $apiKey->hash)->delete();

            return null;
        }

        $subscription = UserSubscription::query()
            ->with('subscription:id,name,code')
            ->where('user_id', $merchant->id)
            ->where('status', SubscriptionStatus::ACTIVE)
            ->latest('id')
            ->first();

        $payload = [
            'api_key_hash' => $apiKey->hash,
            'merchant_api_key_id' => $apiKey->id,
            'merchant_id' => $merchant->id,
            'merchant_name' => $merchant->name,
            'merchant_email' => $merchant->email,
            'merchant_status' => (int) ($merchant->status ?? 1),
            'merchant_role' => $merchant->role?->value ?? Role::MERCHANT->value,
            'api_key_status' => $apiKey->status?->value ?? MerchantAPIKeyStatus::INACTIVE->value,
            'subscription_id' => $subscription?->subscription_id,
            'subscription_name' => $subscription?->subscription?->name,
            'subscription_code' => $subscription?->subscription?->code,
            'subscription_status' => $subscription?->status?->value,
            'permissions' => [
                'payments:create',
                'payments:read',
                'payments:track',
            ],
            'allowed_routes' => [
                'POST /api/v1/payments',
                'GET /api/v1/payments',
                'GET /api/v1/payments/:id/show',
                'GET /api/v1/payments/:id/tracking',
            ],
            'allowed_providers' => $providers,
            'rate_limit_per_minute' => 120,
            'cache_version' => now()->timestamp,
            'synced_at' => now(),
            'revoked_at' => $apiKey->status === MerchantAPIKeyStatus::ACTIVE ? null : now(),
        ];

        $profile = GatewayAccessProfile::query()->updateOrCreate(
            ['api_key_hash' => $apiKey->hash],
            $payload
        );

        $this->writeCache($profile);

        return $profile;
    }

    public function invalidate(string $apiKeyHash): void
    {
        try {
            Redis::del($this->cacheKey($apiKeyHash));
            Redis::del($this->negativeCacheKey($apiKeyHash));
        } catch (Throwable) {
            // Redis outages must not block SaaS writes; gateway has DB fallback.
        }
    }

    private function writeCache(GatewayAccessProfile $profile): void
    {
        try {
            Redis::setex(
                $this->cacheKey($profile->api_key_hash),
                self::CACHE_TTL_SECONDS,
                json_encode($this->gatewayPayload($profile), JSON_THROW_ON_ERROR)
            );
            Redis::del($this->negativeCacheKey($profile->api_key_hash));
        } catch (Throwable) {
            // DB row remains source of truth if Redis is temporarily unavailable.
        }
    }

    private function gatewayPayload(GatewayAccessProfile $profile): array
    {
        return [
            'valid' => $profile->api_key_status === 1
                && $profile->merchant_status === 1
                && $profile->subscription_status === 1,
            'merchantId' => $profile->merchant_id,
            'subscriptionId' => $profile->subscription_id,
            'planName' => $profile->subscription_name,
            'merchantRole' => $profile->merchant_role,
            'permissions' => $profile->permissions ?? [],
            'allowedRoutes' => $profile->allowed_routes ?? [],
            'allowedProviders' => $profile->allowed_providers ?? [],
            'rateLimitPerMinute' => $profile->rate_limit_per_minute,
            'cacheVersion' => $profile->cache_version,
        ];
    }

    private function cacheKey(string $apiKeyHash): string
    {
        return self::CACHE_PREFIX.$apiKeyHash;
    }

    private function negativeCacheKey(string $apiKeyHash): string
    {
        return self::CACHE_PREFIX.'invalid:'.$apiKeyHash;
    }

    private function loadProviders(): array
    {
        return Provider::query()
            ->orderBy('alias')
            ->pluck('alias')
            ->values()
            ->all();
    }
}
