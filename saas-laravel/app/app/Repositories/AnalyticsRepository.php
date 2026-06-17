<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\PaymentStatus;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsRepository
{
    /**
     * Top-level KPI summary for the selected period and environment.
     */
    public function getOverview(string $merchantId, int $days = 30, string $environment = 'test'): array
    {
        $since = Carbon::now()->subDays($days)->startOfDay();

        $row = DB::table('payments')
            ->selectRaw('
                COUNT(*)                                                                AS total,
                COUNT(CASE WHEN status = ? THEN 1 END)                                  AS succeeded,
                COUNT(CASE WHEN status = ? THEN 1 END)                                  AS failed,
                SUM(CASE WHEN status = ? THEN price ELSE 0 END)                         AS volume,
                MIN(currency)                                                            AS currency
            ', [
                PaymentStatus::FINISHED->value,
                PaymentStatus::FAILED->value,
                PaymentStatus::FINISHED->value,
            ])
            ->where('merchant_id', $merchantId)
            ->where('environment', $environment)
            ->where('created_at', '>=', $since)
            ->first();

        $avgLatency = DB::table('payment_routing_attempts')
            ->where('merchant_id', $merchantId)
            ->where('environment', $environment)
            ->where('created_at', '>=', $since)
            ->whereNotNull('latency_ms')
            ->avg('latency_ms');
        $avgLatency = $avgLatency !== null ? (float) $avgLatency : null;

        // Previous period for trend deltas
        $prevSince = Carbon::now()->subDays($days * 2)->startOfDay();
        $prevRow = DB::table('payments')
            ->selectRaw('
                COUNT(*)                                                   AS total,
                COUNT(CASE WHEN status = ? THEN 1 END)                     AS succeeded,
                SUM(CASE WHEN status = ? THEN price ELSE 0 END)            AS volume
            ', [
                PaymentStatus::FINISHED->value,
                PaymentStatus::FINISHED->value,
            ])
            ->where('merchant_id', $merchantId)
            ->where('environment', $environment)
            ->whereBetween('created_at', [$prevSince, $since])
            ->first();

        $total     = (int) ($row->total ?? 0);
        $succeeded = (int) ($row->succeeded ?? 0);
        $failed    = (int) ($row->failed ?? 0);
        $volume    = (float) ($row->volume ?? 0);
        $successRate = $total > 0 ? round($succeeded / $total * 100, 1) : 0.0;

        $prevTotal     = (int) ($prevRow->total ?? 0);
        $prevSucceeded = (int) ($prevRow->succeeded ?? 0);
        $prevVolume    = (float) ($prevRow->volume ?? 0);
        $prevSuccessRate = $prevTotal > 0 ? round($prevSucceeded / $prevTotal * 100, 1) : 0.0;

        return [
            'total'            => $total,
            'succeeded'        => $succeeded,
            'failed'           => $failed,
            'volume'           => $volume,
            'currency'         => $row->currency ?? 'USD',
            'success_rate'     => $successRate,
            'avg_latency_ms'   => $avgLatency !== null ? (int) round($avgLatency) : null,
            'delta_total'      => $prevTotal > 0 ? round(($total - $prevTotal) / $prevTotal * 100, 1) : null,
            'delta_volume'     => $prevVolume > 0 ? round(($volume - $prevVolume) / $prevVolume * 100, 1) : null,
            'delta_rate'       => $prevSuccessRate > 0 ? round($successRate - $prevSuccessRate, 1) : null,
        ];
    }

    /**
     * Per-day breakdown: total, succeeded, volume, success_rate.
     */
    public function getDailyTrend(string $merchantId, int $days = 30, string $environment = 'test'): array
    {
        $since = Carbon::now()->subDays($days)->startOfDay();

        $rows = DB::table('payments')
            ->selectRaw('
                DATE(created_at) AS date,
                COUNT(*)                                          AS total,
                COUNT(CASE WHEN status = ? THEN 1 END)           AS succeeded,
                SUM(price)                                        AS volume
            ', [PaymentStatus::FINISHED->value])
            ->where('merchant_id', $merchantId)
            ->where('environment', $environment)
            ->where('created_at', '>=', $since)
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date')
            ->get();

        // Fill in zero-value days so charts have continuous x-axis
        $byDate = collect($rows)->keyBy('date');
        $result = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->format('Y-m-d');
            $row  = $byDate->get($date);
            $total     = $row ? (int) $row->total : 0;
            $succeeded = $row ? (int) $row->succeeded : 0;
            $result[]  = [
                'date'         => $date,
                'total'        => $total,
                'succeeded'    => $succeeded,
                'volume'       => $row ? (float) $row->volume : 0.0,
                'success_rate' => $total > 0 ? round($succeeded / $total * 100, 1) : 0.0,
            ];
        }

        return $result;
    }

    /**
     * Provider-level auth-rate, attempt counts, and latency.
     */
    public function getProviderPerformance(string $merchantId, int $days = 30, string $environment = 'test'): array
    {
        $rows = DB::table('payment_routing_attempts')
            ->selectRaw("
                provider_alias,
                COUNT(*)                                                               AS total,
                SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END)                  AS succeeded,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)                     AS failed,
                SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END)                    AS timeouts,
                SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END)                    AS skipped,
                ROUND(AVG(latency_ms)::numeric, 0)                                     AS avg_latency_ms,
                MIN(latency_ms)                                                        AS min_latency_ms,
                MAX(latency_ms)                                                        AS max_latency_ms,
                ROUND(
                    SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) * 100.0
                    / NULLIF(COUNT(*), 0),
                1)                                                                     AS success_rate
            ")
            ->where('merchant_id', $merchantId)
            ->where('environment', $environment)
            ->where('status', '!=', 'skipped')
            ->groupBy('provider_alias')
            ->orderByDesc('total')
            ->get();

        return $rows->map(fn ($r) => [
            'provider'        => $r->provider_alias,
            'provider_alias'  => $r->provider_alias,
            'total'           => (int) $r->total,
            'total_attempts'  => (int) $r->total,
            'succeeded'       => (int) $r->succeeded,
            'failed'          => (int) $r->failed,
            'timeouts'        => (int) $r->timeouts,
            'skipped'         => (int) $r->skipped,
            'avg_latency_ms'  => $r->avg_latency_ms ? (int) $r->avg_latency_ms : null,
            'min_latency_ms'  => $r->min_latency_ms !== null ? (int) $r->min_latency_ms : null,
            'max_latency_ms'  => $r->max_latency_ms !== null ? (int) $r->max_latency_ms : null,
            'success_rate'    => (float) ($r->success_rate ?? 0),
        ])->toArray();
    }

    /**
     * Most frequent error / decline codes across routing attempts.
     */
    public function getTopDeclineCodes(string $merchantId, int $days = 30, string $environment = 'test', int $limit = 8): array
    {
        $since = Carbon::now()->subDays($days)->startOfDay();

        $rows = DB::table('payment_routing_attempts')
            ->selectRaw('error_code, COUNT(*) AS count')
            ->where('merchant_id', $merchantId)
            ->where('environment', $environment)
            ->whereNotNull('error_code')
            ->where('error_code', '!=', '')
            ->where('created_at', '>=', $since)
            ->groupBy('error_code')
            ->orderByDesc('count')
            ->limit($limit)
            ->get();

        return $rows->map(fn ($r) => [
            'error_code' => $r->error_code,
            'count'      => (int) $r->count,
        ])->toArray();
    }

    /**
     * Routing strategy breakdown for the period.
     */
    public function getRoutingDistribution(string $merchantId, int $days = 30, string $environment = 'test'): array
    {
        $since = Carbon::now()->subDays($days)->startOfDay();

        $rows = DB::table('payments')
            ->selectRaw('routing_strategy, COUNT(*) AS count')
            ->where('merchant_id', $merchantId)
            ->where('environment', $environment)
            ->where('created_at', '>=', $since)
            ->whereNotNull('routing_strategy')
            ->groupBy('routing_strategy')
            ->orderByDesc('count')
            ->get();

        return $rows->map(fn ($r) => [
            'strategy' => $r->routing_strategy,
            'count'    => (int) $r->count,
        ])->toArray();
    }

    /**
     * Latency percentile buckets for routing attempts.
     */
    public function getLatencyBuckets(string $merchantId, int $days = 30, string $environment = 'test'): array
    {
        $since = Carbon::now()->subDays($days)->startOfDay();

        $buckets = [
            '<100ms'    => [0, 100],
            '100-300ms' => [100, 300],
            '300-600ms' => [300, 600],
            '600ms-1s'  => [600, 1000],
            '>1s'       => [1000, PHP_INT_MAX],
        ];

        $result = [];
        foreach ($buckets as $label => [$min, $max]) {
            $query = DB::table('payment_routing_attempts')
                ->where('merchant_id', $merchantId)
                ->where('environment', $environment)
                ->where('created_at', '>=', $since)
                ->whereNotNull('latency_ms')
                ->where('latency_ms', '>=', $min);

            if ($max !== PHP_INT_MAX) {
                $query->where('latency_ms', '<', $max);
            }

            $result[] = ['bucket' => $label, 'count' => (int) $query->count()];
        }

        return $result;
    }
}
