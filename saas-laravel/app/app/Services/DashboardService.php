<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\DashboardRepository;

final class DashboardService
{
    public function __construct(
        private readonly DashboardRepository $dashboard
    ) {}

    public function getSummary(string $merchantId): array
    {
        return $this->dashboard->getSummary($merchantId);
    }
}
