<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\Analytics\AnalyticsRepositoryInterface;
use App\Contracts\ApiKeys\ApiKeyRepositoryInterface;
use App\Contracts\Dashboard\DashboardRepositoryInterface;
use App\Contracts\Merchants\MerchantRepositoryInterface;
use App\Contracts\Payments\PaymentRepositoryInterface;
use App\Contracts\Routing\RoutingRepositoryInterface;
use App\Contracts\Subscriptions\SubscriptionRepositoryInterface;
use App\Repositories\AnalyticsRepository;
use App\Repositories\ApiKeyRepository;
use App\Repositories\DashboardRepository;
use App\Repositories\MerchantRepository;
use App\Repositories\PaymentRepository;
use App\Repositories\RoutingRepository;
use App\Repositories\SubscriptionRepository;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(MerchantRepositoryInterface::class, MerchantRepository::class);
        $this->app->bind(ApiKeyRepositoryInterface::class, ApiKeyRepository::class);
        $this->app->bind(RoutingRepositoryInterface::class, RoutingRepository::class);
        $this->app->bind(PaymentRepositoryInterface::class, PaymentRepository::class);
        $this->app->bind(SubscriptionRepositoryInterface::class, SubscriptionRepository::class);
        $this->app->bind(AnalyticsRepositoryInterface::class, AnalyticsRepository::class);
        $this->app->bind(DashboardRepositoryInterface::class, DashboardRepository::class);
    }

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
    }
}
