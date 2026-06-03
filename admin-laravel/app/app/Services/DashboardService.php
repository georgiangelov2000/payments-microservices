<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\DashboardRepository;

final class DashboardService
{
    public function __construct(
        private readonly DashboardRepository $dashboardRepository,
    ) {}

    public function getMetrics(): array
    {
        return $this->dashboardRepository->getMetrics();
    }

    public function getRecentPayments(int $limit = 8): array
    {
        return $this->dashboardRepository->getRecentPayments($limit);
    }
}
