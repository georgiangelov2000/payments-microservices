<?php

declare(strict_types=1);

namespace App\Contracts\Analytics;

use Illuminate\Support\Collection;

interface AnalyticsRepositoryInterface
{
    public function summary(string $environment): array;

    public function providerStats(string $environment, ?string $merchantId = null): Collection;

    public function strategyDistribution(string $environment): Collection;

    public function dailyFailovers(string $environment, int $days): Collection;

    public function topErrors(string $environment, int $limit): Collection;
}
