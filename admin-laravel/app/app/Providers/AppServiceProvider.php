<?php
namespace App\Providers;

use App\Contracts\ApiKeys\ApiKeyRepositoryInterface;
use App\Contracts\Merchants\MerchantRepositoryInterface;
use App\Contracts\Routing\RoutingRepositoryInterface;
use App\Repositories\ApiKeyRepository;
use App\Repositories\MerchantRepository;
use App\Repositories\RoutingRepository;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(MerchantRepositoryInterface::class, MerchantRepository::class);
        $this->app->bind(ApiKeyRepositoryInterface::class, ApiKeyRepository::class);
        $this->app->bind(RoutingRepositoryInterface::class, RoutingRepository::class);
    }

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
    }
}
