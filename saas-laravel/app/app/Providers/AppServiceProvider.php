<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\ApiKeys\ApiKeyRepositoryInterface;
use App\Contracts\ApiRequests\ApiRequestsRepositoryInterface;
use App\Contracts\Payments\PaymentRepositoryInterface;
use App\Contracts\Subscriptions\SubscriptionRepositoryInterface;
use App\Jobs\SyncGatewayAccessProfileJob;
use App\Models\MerchantApiKey;
use App\Models\Provider;
use App\Models\Subscription;
use App\Models\User;
use App\Models\UserSubscription;
use App\Repositories\ApiKeyRepository;
use App\Repositories\ApiRequestRepository;
use App\Repositories\PaymentRepository;
use App\Repositories\SubscriptionRepository;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            PaymentRepositoryInterface::class,
            PaymentRepository::class
        );

        $this->app->bind(
            ApiKeyRepositoryInterface::class,
            ApiKeyRepository::class
        );

        $this->app->bind(
            SubscriptionRepositoryInterface::class,
            SubscriptionRepository::class
        );

        $this->app->bind(
            ApiRequestsRepositoryInterface::class,
            ApiRequestRepository::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Dispatch queued jobs instead of running gateway-profile syncs synchronously.
        // This keeps HTTP request latency unaffected by Redis/DB write overhead and
        // ensures transient failures are automatically retried by the queue worker.

        MerchantApiKey::saved(
            fn (MerchantApiKey $apiKey) => SyncGatewayAccessProfileJob::dispatch(
                type: 'sync_api_key',
                apiKeyId: $apiKey->id,
            )
        );

        MerchantApiKey::deleted(
            fn (MerchantApiKey $apiKey) => SyncGatewayAccessProfileJob::dispatch(
                type: 'invalidate_key',
                apiKeyHash: $apiKey->hash,
            )
        );

        User::saved(
            fn (User $user) => SyncGatewayAccessProfileJob::dispatch(
                type: 'sync_merchant',
                merchantId: $user->id,
            )
        );

        UserSubscription::saved(
            fn (UserSubscription $subscription) => SyncGatewayAccessProfileJob::dispatch(
                type: 'sync_merchant',
                merchantId: $subscription->user_id,
            )
        );

        UserSubscription::deleted(
            fn (UserSubscription $subscription) => SyncGatewayAccessProfileJob::dispatch(
                type: 'sync_merchant',
                merchantId: $subscription->user_id,
            )
        );

        Provider::saved(
            fn () => SyncGatewayAccessProfileJob::dispatch(type: 'sync_all')
        );

        Provider::deleted(
            fn () => SyncGatewayAccessProfileJob::dispatch(type: 'sync_all')
        );

        Subscription::saved(
            fn () => SyncGatewayAccessProfileJob::dispatch(type: 'sync_all')
        );

        Subscription::deleted(
            fn () => SyncGatewayAccessProfileJob::dispatch(type: 'sync_all')
        );

        Vite::prefetch(concurrency: 3);
    }
}
