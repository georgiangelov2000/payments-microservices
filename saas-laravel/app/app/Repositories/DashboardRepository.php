<?php

namespace App\Repositories;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardRepository
{
    public function getSummary(string $merchantId): array
    {
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth   = Carbon::now()->endOfMonth();

        $row = Payment::query()
            ->select([
                DB::raw('COUNT(*) AS total_payments'),
                DB::raw("COUNT(CASE WHEN created_at BETWEEN '{$startOfMonth}' AND '{$endOfMonth}' THEN 1 END) AS payments_this_month"),
                DB::raw('COUNT(CASE WHEN status = ' . PaymentStatus::FINISHED->value . " THEN 1 END) AS payments_finished"),
                DB::raw('COUNT(CASE WHEN status = ' . PaymentStatus::PENDING->value  . " THEN 1 END) AS payments_pending"),
                DB::raw('COUNT(CASE WHEN status = ' . PaymentStatus::FAILED->value   . " THEN 1 END) AS payments_failed"),
            ])
            ->where('merchant_id', $merchantId)
            ->first();

        return [
            'total_payments'      => (int) ($row->total_payments ?? 0),
            'payments_this_month' => (int) ($row->payments_this_month ?? 0),
            'payments_finished'   => (int) ($row->payments_finished ?? 0),
            'payments_pending'    => (int) ($row->payments_pending ?? 0),
            'payments_failed'     => (int) ($row->payments_failed ?? 0),
        ];
    }
}
