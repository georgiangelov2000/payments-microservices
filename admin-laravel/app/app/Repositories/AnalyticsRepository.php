<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Analytics\AnalyticsRepositoryInterface;
use App\Enums\PaymentStatus;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class AnalyticsRepository implements AnalyticsRepositoryInterface
{
    public function providerStats(string $environment = 'test', ?string $merchantId = null): Collection
    {
        $query = DB::table('payments')
            ->join('providers', 'providers.id', '=', 'payments.provider_id')
            ->select([
                'providers.alias as provider_alias',
                DB::raw('COUNT(payments.id) as total_payments'),
                DB::raw('SUM(CASE WHEN payments.status = '.PaymentStatus::FINISHED->value.' THEN 1 ELSE 0 END) as successful_payments'),
                DB::raw('SUM(CASE WHEN payments.status IN ('.PaymentStatus::PENDING->value.', '.PaymentStatus::PROCESSING->value.') THEN 1 ELSE 0 END) as pending_payments'),
                DB::raw('SUM(CASE WHEN payments.status = '.PaymentStatus::FAILED->value.' THEN 1 ELSE 0 END) as failed_payments'),
                DB::raw('COALESCE(SUM(CASE WHEN payments.status = '.PaymentStatus::FINISHED->value.' THEN payments.price ELSE 0 END), 0) as paid_volume'),
                DB::raw('COALESCE(AVG(CASE WHEN payments.status = '.PaymentStatus::FINISHED->value.' THEN payments.price END), 0) as avg_payment_amount'),
                DB::raw("COALESCE(MIN(COALESCE(payments.currency, 'USD')), 'USD') as currency"),
                DB::raw("COUNT(DISTINCT COALESCE(payments.currency, 'USD')) as currencies_count"),
            ])
            ->where('payments.environment', $environment)
            ->groupBy('providers.alias')
            ->orderByDesc('total_payments');

        if ($merchantId) {
            $query->where('payments.merchant_id', $merchantId);
        }

        return $query->get()->map(function (object $row): array {
            $totalPayments = (int) $row->total_payments;
            $successfulPayments = (int) $row->successful_payments;

            return [
                'provider' => $row->provider_alias,
                'total' => $totalPayments,
                'succeeded' => $successfulPayments,
                'pending' => (int) $row->pending_payments,
                'failed' => (int) $row->failed_payments,
                'paid_volume' => (float) $row->paid_volume,
                'avg_payment' => (float) $row->avg_payment_amount,
                'currency' => $row->currency ?: 'USD',
                'currencies_count' => (int) $row->currencies_count,
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
                'strategy' => $row->strategy,
                'total' => (int) $row->total,
                'successes' => (int) $row->successes,
                'success_rate' => $row->total > 0
                    ? round($row->successes / $row->total * 100, 1)
                    : 0.0,
            ]);
    }

    public function dailyFailovers(string $environment = 'test', int $days = 30): Collection
    {
        return DB::table('payment_routing_attempts')
            ->select([
                DB::raw('DATE(created_at) as date'),
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
                'date' => $row->date,
                'total' => (int) $row->total,
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
                'provider' => $row->provider_alias,
                'error_code' => $row->error_code,
                'occurrences' => (int) $row->occurrences,
                'last_seen' => $row->last_seen,
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

        $total = (int) ($row->total ?? 0);
        $success = (int) ($row->successes ?? 0);

        return [
            'total_attempts' => $total,
            'total_succeeded' => $success,
            'total_failed' => (int) ($row->failures ?? 0),
            'overall_rate' => $total > 0 ? round($success / $total * 100, 1) : 0.0,
            'avg_latency_ms' => $row->avg_latency !== null ? (int) $row->avg_latency : null,
        ];
    }
}
