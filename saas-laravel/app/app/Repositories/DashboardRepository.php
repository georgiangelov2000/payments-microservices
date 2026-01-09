<?php

namespace App\Repositories;

use App\Models\Payment;
use Carbon\Carbon;

class DashboardRepository
{
    public function getTotalPayments(int $merchantId): int
    {
        return Payment::where('merchant_id', $merchantId)->count();
    }

    public function getPaymentsThisMonth(int $merchantId): int
    {
        return Payment::where('merchant_id', $merchantId)
            ->whereBetween('created_at', [
                Carbon::now()->startOfMonth(),
                Carbon::now()->endOfMonth(),
            ])
            ->count();
    }
}
