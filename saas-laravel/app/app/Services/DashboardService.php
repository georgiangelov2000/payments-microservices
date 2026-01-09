<?php

namespace App\Services;

use App\Repositories\DashboardRepository;

class DashboardService
{
    public function __construct(
        protected DashboardRepository $dashboard
    ) {}

    public function getSummary(int $merchantId): array
    {
        return [
            'total_payments' => $this->dashboard->getTotalPayments($merchantId),
            'payments_this_month' => $this->dashboard->getPaymentsThisMonth($merchantId),
        ];
    }
}
