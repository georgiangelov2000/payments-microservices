<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardRepository
{
    public function getSummary(string $merchantId): array
    {
        $now          = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth   = $now->copy()->endOfMonth();
        $last7        = $now->copy()->subDays(7)->startOfDay();
        $prev7Start   = $now->copy()->subDays(14)->startOfDay();

        // Core payment counts + volume
        $row = Payment::query()
            ->selectRaw('
                COUNT(*)                                                                           AS total_payments,
                COUNT(CASE WHEN created_at BETWEEN ? AND ? THEN 1 END)                            AS payments_this_month,
                COUNT(CASE WHEN status = ? THEN 1 END)                                            AS payments_finished,
                COUNT(CASE WHEN status = ? THEN 1 END)                                            AS payments_pending,
                COUNT(CASE WHEN status = ? THEN 1 END)                                            AS payments_failed,
                COUNT(CASE WHEN created_at >= ? THEN 1 END)                                       AS payments_7d,
                COUNT(CASE WHEN status = ? AND created_at >= ? THEN 1 END)                        AS succeeded_7d,
                SUM(CASE WHEN status = ? AND created_at >= ? THEN price ELSE 0 END)               AS volume_7d,
                SUM(CASE WHEN status = ? AND created_at BETWEEN ? AND ? THEN price ELSE 0 END)    AS volume_this_month,
                MIN(currency)                                                                      AS currency
            ', [
                $startOfMonth, $endOfMonth,
                PaymentStatus::FINISHED->value,
                PaymentStatus::PENDING->value,
                PaymentStatus::FAILED->value,
                $last7,
                PaymentStatus::FINISHED->value, $last7,
                PaymentStatus::FINISHED->value, $last7,
                PaymentStatus::FINISHED->value, $startOfMonth, $endOfMonth,
            ])
            ->where('merchant_id', $merchantId)
            ->first();

        // Previous 7-day window for trend delta
        $prev = Payment::query()
            ->selectRaw('
                COUNT(*)                                                AS total,
                COUNT(CASE WHEN status = ? THEN 1 END)                  AS succeeded,
                SUM(CASE WHEN status = ? THEN price ELSE 0 END)         AS volume
            ', [
                PaymentStatus::FINISHED->value,
                PaymentStatus::FINISHED->value,
            ])
            ->where('merchant_id', $merchantId)
            ->whereBetween('created_at', [$prev7Start, $last7])
            ->first();

        // 7-day sparkline (daily counts for mini chart)
        $sparkline = DB::table('payments')
            ->selectRaw('DATE(created_at) AS date, COUNT(*) AS total, COUNT(CASE WHEN status = ? THEN 1 END) AS succeeded', [
                PaymentStatus::FINISHED->value,
            ])
            ->where('merchant_id', $merchantId)
            ->where('created_at', '>=', $last7)
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $spark = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = $now->copy()->subDays($i)->format('Y-m-d');
            $d    = $sparkline->get($date);
            $spark[] = ['date' => $date, 'total' => (int) ($d->total ?? 0), 'succeeded' => (int) ($d->succeeded ?? 0)];
        }

        $payments7d  = (int) ($row->payments_7d ?? 0);
        $succeeded7d = (int) ($row->succeeded_7d ?? 0);
        $successRate = $payments7d > 0 ? round($succeeded7d / $payments7d * 100, 1) : 0.0;

        $prevTotal    = (int) ($prev->total ?? 0);
        $prevSucceeded = (int) ($prev->succeeded ?? 0);
        $prevRate     = $prevTotal > 0 ? round($prevSucceeded / $prevTotal * 100, 1) : 0.0;

        return [
            // All-time
            'total_payments'      => (int) ($row->total_payments ?? 0),
            'payments_this_month' => (int) ($row->payments_this_month ?? 0),
            'payments_finished'   => (int) ($row->payments_finished ?? 0),
            'payments_pending'    => (int) ($row->payments_pending ?? 0),
            'payments_failed'     => (int) ($row->payments_failed ?? 0),
            // 7-day KPIs
            'payments_7d'         => $payments7d,
            'succeeded_7d'        => $succeeded7d,
            'success_rate_7d'     => $successRate,
            'volume_7d'           => (float) ($row->volume_7d ?? 0),
            'volume_this_month'   => (float) ($row->volume_this_month ?? 0),
            'currency'            => $row->currency ?? 'USD',
            // Trend deltas vs previous 7-day window
            'delta_volume'        => $prevRate > 0 ? round($successRate - $prevRate, 1) : null,
            'sparkline'           => $spark,
        ];
    }
}
