<?php

namespace App\Providers;

use App\Models\MerchantApiKey;
use App\Models\Provider;
use App\Models\Subscription;
use App\Models\User;
use App\Models\UserSubscription;
use App\Services\GatewayAccessProfileService;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use App\Contracts\ApiKeys\ApiKeyRepositoryInterface;
use App\Contracts\ApiRequests\ApiRequestsRepositoryInterface;
use App\Contracts\Payments\PaymentRepositoryInterface;
use App\Contracts\Subscriptions\SubscriptionRepositoryInterface;
use App\Repositories\ApiKeyRepository;
use App\Repositories\ApiRequestRepository;
use App\Repositories\PaymentRepository;
use App\Repositories\SubscriptionRepository;


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
        Inertia::share([
            'csrf_token' => fn () => csrf_token(),
        ]);        

        MerchantApiKey::saved(fn (MerchantApiKey $apiKey) => app(GatewayAccessProfileService::class)->syncApiKey($apiKey));
        MerchantApiKey::deleted(fn (MerchantApiKey $apiKey) => app(GatewayAccessProfileService::class)->invalidate($apiKey->hash));
        User::saved(fn (User $user) => app(GatewayAccessProfileService::class)->syncForMerchant($user->id));
        UserSubscription::saved(fn (UserSubscription $subscription) => app(GatewayAccessProfileService::class)->syncForMerchant($subscription->user_id));
        UserSubscription::deleted(fn (UserSubscription $subscription) => app(GatewayAccessProfileService::class)->syncForMerchant($subscription->user_id));
        Provider::saved(fn () => app(GatewayAccessProfileService::class)->syncAll());
        Provider::deleted(fn () => app(GatewayAccessProfileService::class)->syncAll());
        Subscription::saved(fn () => app(GatewayAccessProfileService::class)->syncAll());
        Subscription::deleted(fn () => app(GatewayAccessProfileService::class)->syncAll());

        Vite::prefetch(concurrency: 3);
    }
}
