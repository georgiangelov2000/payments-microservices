<?php

namespace App\Providers;

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
        Vite::prefetch(concurrency: 3);
    }
}
