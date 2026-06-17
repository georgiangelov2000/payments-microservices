<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Payments\PaymentRepositoryInterface;
use App\Enums\PaymentStatus;
use App\Models\AdminExportFile;
use App\Models\Payment;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

final class PaymentService
{
    public function __construct(
        private readonly PaymentRepositoryInterface $repository,
    ) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        return $this->repository->paginate($filters);
    }

    public function merchantActivity(array $filters): array
    {
        $activity = $this->repository->merchantActivity($filters, 20);
        $latestPayments = $this->latestPaymentsByMerchant(
            $activity['merchants']->getCollection()->pluck('id')->all(),
            $activity['range'],
            $filters,
        );

        $activity['merchants']->getCollection()->each(
            fn ($merchant) => $merchant->setAttribute('latest_payment', $latestPayments[$merchant->id] ?? null)
        );

        return $activity;
    }

    /**
     * Export rows are intentionally kept here because this is file/export formatting,
     * not HTTP response serialization.
     *
     * @return array{ range: array{from: string, to: string, label: string}, rows: array<int, array<string, mixed>> }
     */
    public function merchantActivityExportRows(array $filters): array
    {
        $activity = $this->repository->merchantActivityExport($filters);
        $merchants = $activity['merchants'];
        $range = $activity['range'];
        $latestPayments = $this->latestPaymentsByMerchant(
            $merchants->pluck('id')->all(),
            $range,
            $filters,
        );

        $rows = $merchants->map(function ($merchant) use ($latestPayments): array {
            $latest = $latestPayments[$merchant->id] ?? null;
            $hasPayments = (int) $merchant->payments_count > 0;

            return [
                'merchant_name'    => $merchant->name,
                'merchant_email'   => $merchant->email,
                'payments_count'   => (int) $merchant->payments_count,
                'total_amount'     => (float) $merchant->total_amount,
                'currency'         => $merchant->currency ?: 'USD',
                'currencies_count' => (int) $merchant->currencies_count,
                'finished_count'   => (int) $merchant->paid_count,
                'pending_count'    => (int) $merchant->pending_count,
                'failed_count'     => (int) $merchant->failed_count,
                'refunded_count'   => (int) $merchant->refunded_count,
                'latest_order_id'    => $latest?->order_id    ?? ($hasPayments ? '—' : 'No Payments'),
                'latest_amount'      => $latest ? (float) $latest->price : 0,
                'latest_currency'    => $latest?->currency    ?? ($hasPayments ? '—' : '—'),
                'latest_provider'    => $latest?->provider?->alias ?? ($hasPayments ? '—' : '—'),
                'latest_status'      => $latest?->status?->label() ?? ($hasPayments ? '—' : 'No Payments'),
                'latest_payment_at'  => $latest?->created_at?->toDateTimeString() ?? ($hasPayments ? '—' : 'No Payments'),
            ];
        })->values()->all();

        return [
            'range' => $range,
            'rows'  => $rows,
        ];
    }

    public function recentMerchantPaymentExports(string $adminUserId): Collection
    {
        return AdminExportFile::query()
            ->where('admin_user_id', $adminUserId)
            ->where('type', 'merchant_payments')
            ->latest()
            ->limit(8)
            ->get();
    }

    /**
     * @param  array<int|string>  $merchantIds
     * @return array<int|string, Payment>
     */
    private function latestPaymentsByMerchant(array $merchantIds, array $range, array $filters): array
    {
        if ($merchantIds === []) {
            return [];
        }

        $statusValue = isset($filters['status']) && $filters['status'] !== ''
            ? PaymentStatus::fromString($filters['status'])->value
            : null;

        $from = CarbonImmutable::parse($range['from'])->startOfDay();
        $to = CarbonImmutable::parse($range['to'])->endOfDay();

        return Payment::query()
            ->select(['id', 'merchant_id', 'order_id', 'price', 'status', 'currency', 'provider_id', 'created_at'])
            ->with('provider:id,name,alias')
            ->whereIn('merchant_id', $merchantIds)
            ->whereBetween('created_at', [$from, $to])
            ->when($statusValue !== null, fn ($query) => $query->where('status', $statusValue))
            ->latest()
            ->get()
            ->unique('merchant_id')
            ->mapWithKeys(fn (Payment $payment): array => [$payment->merchant_id => $payment])
            ->all();
    }
}
