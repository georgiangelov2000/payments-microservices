<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Payments\PaymentRepositoryInterface;
use App\Enums\PaymentStatus;
use App\Enums\Role;
use App\Models\Payment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final class PaymentRepository implements PaymentRepositoryInterface
{
    public function paginate(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        return Payment::query()
            ->select([
                'id', 'order_id', 'price', 'status', 'provider_status',
                'currency', 'country', 'locale', 'channel',
                'merchant_id', 'provider_id', 'created_at',
            ])
            ->with([
                'merchant:id,name,email',
                'provider:id,name,alias',
                'logs' => fn ($q) => $q->oldest('created_at'),
                'routingAttempts' => fn ($q) => $q->orderBy('attempt_number'),
            ])
            ->when($filters['search'] ?? null, function ($query, string $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereRaw('CAST(order_id AS TEXT) ILIKE ?', ["%{$search}%"])
                        ->orWhereHas('merchant', fn ($q) => $q
                            ->where('name', 'ilike', "%{$search}%")
                            ->orWhere('email', 'ilike', "%{$search}%")
                        );
                });
            })
            ->when(
                $filters['status'] ?? null,
                fn ($q, string $status) => $q->where('status', PaymentStatus::fromString($status)->value)
            )
            ->when(
                $filters['date_from'] ?? null,
                fn ($q, string $date) => $q->whereDate('created_at', '>=', $date)
            )
            ->when(
                $filters['date_to'] ?? null,
                fn ($q, string $date) => $q->whereDate('created_at', '<=', $date)
            )
            ->latest()
            ->paginate($perPage)
            ->withQueryString();
    }

    public function merchantActivity(array $filters, int $perPage = 15): array
    {
        $range = $this->resolveDateRange($filters);
        $status = $filters['status'] ?? null;
        $statusValue = $status ? PaymentStatus::fromString($status)->value : null;

        $merchants = User::query()
            ->where('users.role', Role::MERCHANT->value)
            ->when($filters['search'] ?? null, function (Builder $query, string $search) {
                $query->where(function (Builder $query) use ($search) {
                    $query->where('users.name', 'ilike', "%{$search}%")
                        ->orWhere('users.email', 'ilike', "%{$search}%");
                });
            })
            ->leftJoin('payments', function (JoinClause $join) use ($range, $statusValue) {
                $join->on('payments.merchant_id', '=', 'users.id')
                    ->whereBetween('payments.created_at', [$range['from'], $range['to']]);

                if ($statusValue !== null) {
                    $join->where('payments.status', $statusValue);
                }
            })
            ->select([
                'users.id',
                'users.name',
                'users.email',
                DB::raw('COUNT(payments.id) as payments_count'),
                DB::raw('COALESCE(SUM(payments.price), 0) as total_amount'),
                DB::raw("COALESCE(MIN(COALESCE(payments.currency, 'USD')), 'USD') as currency"),
                DB::raw('COUNT(DISTINCT CASE WHEN payments.id IS NOT NULL THEN COALESCE(payments.currency, \'USD\') END) as currencies_count'),
                DB::raw('SUM(CASE WHEN payments.status = '.PaymentStatus::FINISHED->value.' THEN 1 ELSE 0 END) as paid_count'),
                DB::raw('SUM(CASE WHEN payments.status IN ('.PaymentStatus::PENDING->value.', '.PaymentStatus::PROCESSING->value.') THEN 1 ELSE 0 END) as pending_count'),
                DB::raw('SUM(CASE WHEN payments.status = '.PaymentStatus::FAILED->value.' THEN 1 ELSE 0 END) as failed_count'),
                DB::raw('SUM(CASE WHEN payments.status IN ('.PaymentStatus::REFUNDED->value.', '.PaymentStatus::PARTIALLY_REFUNDED->value.') THEN 1 ELSE 0 END) as refunded_count'),
                DB::raw('MAX(payments.created_at) as last_payment_at'),
            ])
            ->groupBy('users.id', 'users.name', 'users.email')
            ->orderByDesc(DB::raw('COALESCE(SUM(payments.price), 0)'))
            ->orderBy('users.name')
            ->paginate($perPage)
            ->withQueryString();

        return [
            'range' => [
                'from' => $range['from']->toDateString(),
                'to' => $range['to']->toDateString(),
                'label' => $range['label'],
            ],
            'summary' => $this->activitySummary($range, $statusValue),
            'trend' => $this->activityTrend($range, $statusValue),
            'merchants' => $merchants,
            'recent_payments' => $this->recentMerchantPayments($range, $statusValue, $filters),
        ];
    }

    private function resolveDateRange(array $filters): array
    {
        $period = $filters['period'] ?? 'monthly';

        if ($period === 'yearly') {
            $year = (int) ($filters['year'] ?? now()->year);
            $from = CarbonImmutable::create($year, 1, 1)->startOfDay();
            $to = $from->endOfYear();

            return ['from' => $from, 'to' => $to, 'label' => (string) $year];
        }

        if ($period === 'custom') {
            $from = isset($filters['date_from'])
                ? CarbonImmutable::parse($filters['date_from'])->startOfDay()
                : now()->toImmutable()->startOfMonth();
            $to = isset($filters['date_to'])
                ? CarbonImmutable::parse($filters['date_to'])->endOfDay()
                : now()->toImmutable()->endOfDay();

            return ['from' => $from, 'to' => $to, 'label' => $from->toDateString().' to '.$to->toDateString()];
        }

        $month = isset($filters['month'])
            ? CarbonImmutable::createFromFormat('Y-m', $filters['month'])
            : now()->toImmutable();
        $from = $month->startOfMonth()->startOfDay();

        return ['from' => $from, 'to' => $from->endOfMonth(), 'label' => $from->format('F Y')];
    }

    private function filteredPayments(CarbonImmutable $from, CarbonImmutable $to, ?int $statusValue)
    {
        return DB::table('payments')
            ->whereBetween('payments.created_at', [$from, $to])
            ->when($statusValue !== null, fn ($query) => $query->where('payments.status', $statusValue));
    }

    private function activitySummary(array $range, ?int $statusValue): array
    {
        $row = $this->filteredPayments($range['from'], $range['to'], $statusValue)
            ->selectRaw('
                COUNT(*) as payments_count,
                COALESCE(SUM(price), 0) as total_amount,
                COUNT(DISTINCT merchant_id) as active_merchants,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as paid_count,
                SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as failed_count,
                SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as refunded_count
            ', [
                PaymentStatus::FINISHED->value,
                PaymentStatus::PENDING->value,
                PaymentStatus::PROCESSING->value,
                PaymentStatus::FAILED->value,
                PaymentStatus::REFUNDED->value,
                PaymentStatus::PARTIALLY_REFUNDED->value,
            ])
            ->first();

        return [
            'payments_count' => (int) ($row->payments_count ?? 0),
            'total_amount' => (float) ($row->total_amount ?? 0),
            'active_merchants' => (int) ($row->active_merchants ?? 0),
            'paid_count' => (int) ($row->paid_count ?? 0),
            'pending_count' => (int) ($row->pending_count ?? 0),
            'failed_count' => (int) ($row->failed_count ?? 0),
            'refunded_count' => (int) ($row->refunded_count ?? 0),
        ];
    }

    private function activityTrend(array $range, ?int $statusValue): array
    {
        $diffInDays = $range['from']->diffInDays($range['to']);
        $bucket = $diffInDays > 92 ? "DATE_TRUNC('month', payments.created_at)" : 'DATE(payments.created_at)';

        return $this->filteredPayments($range['from'], $range['to'], $statusValue)
            ->select([
                DB::raw($bucket.' as period'),
                DB::raw('COUNT(*) as payments_count'),
                DB::raw('COALESCE(SUM(price), 0) as total_amount'),
            ])
            ->groupByRaw($bucket)
            ->orderByRaw($bucket.' ASC')
            ->get()
            ->map(fn (object $row): array => [
                'period' => (string) $row->period,
                'payments_count' => (int) $row->payments_count,
                'total_amount' => (float) $row->total_amount,
            ])
            ->all();
    }

    private function recentMerchantPayments(array $range, ?int $statusValue, array $filters): array
    {
        return Payment::query()
            ->select([
                'id', 'order_id', 'price', 'status', 'currency', 'merchant_id', 'provider_id', 'created_at',
            ])
            ->with(['merchant:id,name,email', 'provider:id,name,alias'])
            ->whereBetween('created_at', [$range['from'], $range['to']])
            ->when($statusValue !== null, fn ($query) => $query->where('status', $statusValue))
            ->when($filters['search'] ?? null, function ($query, string $search) {
                $query->whereHas('merchant', fn ($query) => $query
                    ->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                );
            })
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (Payment $payment): array => [
                'id' => $payment->id,
                'order_id' => $payment->order_id,
                'amount' => (float) $payment->price,
                'currency' => $payment->currency ?: 'USD',
                'status' => $payment->status?->label(),
                'merchant' => $payment->merchant ? [
                    'name' => $payment->merchant->name,
                    'email' => $payment->merchant->email,
                ] : null,
                'provider' => $payment->provider?->alias,
                'created_at' => $payment->created_at?->toDateTimeString(),
            ])
            ->all();
    }
}
