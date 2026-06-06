<?php

declare(strict_types=1);

namespace App\Repositories;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class AnalyticsRepository
{
    public function providerStats(string $environment = 'test', ?string $merchantId = null): Collection
    {
        $query = DB::table('payment_routing_attempts')
            ->select([
                'provider_alias',
                DB::raw('COUNT(*) as total_attempts'),
                DB::raw("SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as successes"),
                DB::raw("SUM(CASE WHEN status = 'failed'    THEN 1 ELSE 0 END) as failures"),
                DB::raw("SUM(CASE WHEN status = 'timeout'   THEN 1 ELSE 0 END) as timeouts"),
                DB::raw("SUM(CASE WHEN status = 'skipped'   THEN 1 ELSE 0 END) as skipped"),
                DB::raw('ROUND(AVG(latency_ms)::numeric, 0)  as avg_latency_ms'),
                DB::raw('MIN(latency_ms) as min_latency_ms'),
                DB::raw('MAX(latency_ms) as max_latency_ms'),
            ])
            ->where('environment', $environment)
            ->groupBy('provider_alias')
            ->orderByDesc('total_attempts');

        if ($merchantId) {
            $query->where('merchant_id', $merchantId);
        }

        return $query->get()->map(function (object $row): array {
            $total   = (int) $row->total_attempts;
            $success = (int) $row->successes;

            return [
                'provider'       => $row->provider_alias,
                'total'          => $total,
                'succeeded'      => $success,
                'failed'         => (int) $row->failures,
                'timeouts'       => (int) $row->timeouts,
                'skipped'        => (int) $row->skipped,
                'success_rate'   => $total > 0 ? round($success / $total * 100, 1) : 0.0,
                'avg_latency_ms' => $row->avg_latency_ms !== null ? (int) $row->avg_latency_ms : null,
                'min_latency_ms' => $row->min_latency_ms,
                'max_latency_ms' => $row->max_latency_ms,
            ];
        });
    }

    public function strategyDistribution(string $environment = 'test'): Collection
    {
        return DB::table('payment_routing_attempts')
            ->select([
                'strategy',
                DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as successes"),
            ])
            ->where('environment', $environment)
            ->groupBy('strategy')
            ->orderByDesc('total')
            ->get()
            ->map(fn (object $row): array => [
                'strategy'    => $row->strategy,
                'total'       => (int) $row->total,
                'successes'   => (int) $row->successes,
                'success_rate' => $row->total > 0
                    ? round($row->successes / $row->total * 100, 1)
                    : 0.0,
            ]);
    }

    public function dailyFailovers(string $environment = 'test', int $days = 30): Collection
    {
        return DB::table('payment_routing_attempts')
            ->select([
                DB::raw("DATE(created_at) as date"),
                DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN status IN ('failed', 'timeout') THEN 1 ELSE 0 END) as failovers"),
                DB::raw("SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as successes"),
            ])
            ->where('environment', $environment)
            ->where('created_at', '>=', now()->subDays($days))
            ->groupByRaw('DATE(created_at)')
            ->orderByRaw('DATE(created_at) ASC')
            ->get()
            ->map(fn (object $row): array => [
                'date'      => $row->date,
                'total'     => (int) $row->total,
                'failovers' => (int) $row->failovers,
                'successes' => (int) $row->successes,
            ]);
    }

    public function topErrors(string $environment = 'test', int $limit = 10): Collection
    {
        return DB::table('payment_routing_attempts')
            ->select([
                'provider_alias',
                'error_code',
                DB::raw('COUNT(*) as occurrences'),
                DB::raw('MAX(created_at) as last_seen'),
            ])
            ->where('environment', $environment)
            ->whereNotNull('error_code')
            ->whereIn('status', ['failed', 'timeout'])
            ->groupBy('provider_alias', 'error_code')
            ->orderByDesc('occurrences')
            ->limit($limit)
            ->get()
            ->map(fn (object $row): array => [
                'provider'    => $row->provider_alias,
                'error_code'  => $row->error_code,
                'occurrences' => (int) $row->occurrences,
                'last_seen'   => $row->last_seen,
            ]);
    }

    public function summary(string $environment = 'test'): array
    {
        $row = DB::table('payment_routing_attempts')
            ->where('environment', $environment)
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as successes,
                SUM(CASE WHEN status IN ('failed','timeout') THEN 1 ELSE 0 END) as failures,
                ROUND(AVG(latency_ms)::numeric, 0) as avg_latency
            ")
            ->first();

        $total    = (int) ($row->total ?? 0);
        $success  = (int) ($row->successes ?? 0);

        return [
            'total_attempts'  => $total,
            'total_succeeded' => $success,
            'total_failed'    => (int) ($row->failures ?? 0),
            'overall_rate'    => $total > 0 ? round($success / $total * 100, 1) : 0.0,
            'avg_latency_ms'  => $row->avg_latency !== null ? (int) $row->avg_latency : null,
        ];
    }
}
