<?php

namespace App\Services;

use App\Repositories\DashboardRepository;
use App\Enums\PaymentStatus;

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

            'payments_finished' => $this->dashboard->countByStatus($merchantId, PaymentStatus::FINISHED->value),
            'payments_pending'  => $this->dashboard->countByStatus($merchantId, PaymentStatus::PENDING->value),
            'payments_failed'   => $this->dashboard->countByStatus($merchantId, PaymentStatus::FAILED->value),
        ];
    }
}
