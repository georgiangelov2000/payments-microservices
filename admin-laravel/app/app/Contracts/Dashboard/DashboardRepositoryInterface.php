<?php

declare(strict_types=1);

namespace App\Contracts\Dashboard;

interface DashboardRepositoryInterface
{
    public function getMetrics(): array;

    public function getRecentPayments(int $limit = 8): array;
}
