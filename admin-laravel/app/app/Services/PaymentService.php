<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Payments\PaymentRepositoryInterface;
use App\Enums\PaymentStatus;
use App\Models\AdminExportFile;
use App\Models\Payment;
use App\Models\PaymentLog;
use App\Models\PaymentRoutingAttempt;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Pagination\LengthAwarePaginator;

final class PaymentService
{
    public function __construct(
        private readonly PaymentRepositoryInterface $repository,
    ) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        return $this->repository->paginate($filters)->through(
            fn (Payment $payment) => $this->serialize($payment)
        );
    }

    public function merchantActivity(array $filters): array
    {
        $activity = $this->repository->merchantActivity($filters, 20);
        $latestPayments = $this->latestPaymentsByMerchant(
            $activity['merchants']->getCollection()->pluck('id')->all(),
            $activity['range'],
            $filters,
        );

        $activity['merchants'] = $activity['merchants']->through(fn ($merchant): array => [
            'id' => $merchant->id,
            'name' => $merchant->name,
            'email' => $merchant->email,
            'payments_count' => (int) $merchant->payments_count,
            'total_amount' => (float) $merchant->total_amount,
            'currency' => $merchant->currency ?: 'USD',
            'currencies_count' => (int) $merchant->currencies_count,
            'status_counts' => [
                'paid' => (int) $merchant->paid_count,
                'pending' => (int) $merchant->pending_count,
                'failed' => (int) $merchant->failed_count,
                'refunded' => (int) $merchant->refunded_count,
            ],
            'last_payment_at' => $merchant->last_payment_at,
            'latest_payment' => $latestPayments[$merchant->id] ?? null,
        ]);

        return $activity;
    }

    /**
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
                'latest_order_id'    => $latest['order_id']    ?? ($hasPayments ? '—' : 'No Payments'),
                'latest_amount'      => $latest['amount']      ?? 0,
                'latest_currency'    => $latest['currency']    ?? ($hasPayments ? '—' : '—'),
                'latest_provider'    => $latest['provider']    ?? ($hasPayments ? '—' : '—'),
                'latest_status'      => $latest['status']      ?? ($hasPayments ? '—' : 'No Payments'),
                'latest_payment_at'  => $latest['created_at']  ?? ($hasPayments ? '—' : 'No Payments'),
            ];
        })->values()->all();

        return [
            'range' => $range,
            'rows'  => $rows,
        ];
    }

    public function recentMerchantPaymentExports(string $adminUserId): array
    {
        return AdminExportFile::query()
            ->where('admin_user_id', $adminUserId)
            ->where('type', 'merchant_payments')
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (AdminExportFile $export): array => [
                'id' => $export->id,
                'format' => $export->format,
                'status' => $export->status,
                'filename' => $export->filename,
                'message' => $export->message,
                'size' => $export->size,
                'filters' => $export->filters,
                'created_at' => $export->created_at?->toDateTimeString(),
                'completed_at' => $export->completed_at?->toDateTimeString(),
                'failed_at' => $export->failed_at?->toDateTimeString(),
                'download_url' => $export->status === 'completed'
                    ? route('admin.payments.merchants.exports.download', $export)
                    : null,
            ])
            ->all();
    }

    /**
     * @param  array<int|string>  $merchantIds
     * @return array<int|string, array<string, mixed>>
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
            ->mapWithKeys(fn (Payment $payment): array => [
                $payment->merchant_id => [
                    'id' => $payment->id,
                    'order_id' => $payment->order_id,
                    'amount' => (float) $payment->price,
                    'currency' => $payment->currency ?: 'USD',
                    'status' => $payment->status?->label(),
                    'provider' => $payment->provider?->alias,
                    'created_at' => $payment->created_at?->toDateTimeString(),
                ],
            ])
            ->all();
    }

    public function serialize(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'order_id' => $payment->order_id,
            'price' => (float) $payment->price,
            'status' => $payment->status?->label(),
            'currency' => $payment->currency,
            'country' => $payment->country,
            'locale' => $payment->locale,
            'channel' => $payment->channel,
            'merchant' => $payment->merchant ? [
                'name' => $payment->merchant->name,
                'email' => $payment->merchant->email,
            ] : null,
            'provider' => $payment->provider?->alias,
            'created_at' => $payment->created_at?->toDateTimeString(),
            'timing' => $this->timingForPayment($payment),
            'logs' => $payment->logs->map(fn (PaymentLog $log) => [
                'id' => $log->id,
                'event_type' => $log->event_type?->label(),
                'status' => $log->status?->label(),
                'message' => $log->message,
                'payload' => $log->payload,
                'created_at' => $log->created_at?->toDateTimeString(),
            ])->values()->all(),
            'routing_attempts' => $payment->routingAttempts->map(fn (PaymentRoutingAttempt $attempt) => [
                'id' => $attempt->id,
                'provider_alias' => $attempt->provider_alias,
                'attempt_number' => $attempt->attempt_number,
                'status' => $attempt->status,
                'error_code' => $attempt->error_code,
                'error_message' => $attempt->error_message,
                'latency_ms' => $attempt->latency_ms,
                'created_at' => $attempt->created_at?->toDateTimeString(),
            ])->values()->all(),
        ];
    }

    /**
     * @return array{request_started_at: string, last_provider_update_at: string, processing_duration: string, duration_seconds: int|null, state: string}
     */
    private function timingForPayment(Payment $payment): array
    {
        $startedAt = $payment->created_at;
        $lastLogAt = $payment->logs
            ->pluck('created_at')
            ->filter()
            ->sortBy(fn (CarbonInterface $timestamp): int => $timestamp->getTimestamp())
            ->last();
        $lastProviderUpdate = $lastLogAt ?: $payment->updated_at;
        $status = strtolower((string) ($payment->status?->label() ?? ''));
        $endAt = $status === 'pending' ? now() : $lastProviderUpdate;
        $durationSeconds = $startedAt && $endAt
            ? (int) max(0, round($startedAt->diffInSeconds($endAt)))
            : null;

        return [
            'request_started_at' => $startedAt?->toDateTimeString() ?? '—',
            'last_provider_update_at' => $lastProviderUpdate?->toDateTimeString() ?? '—',
            'processing_duration' => $this->humanDuration($durationSeconds),
            'duration_seconds' => $durationSeconds,
            'state' => $status,
        ];
    }

    private function humanDuration(?int $seconds): string
    {
        if ($seconds === null) {
            return '—';
        }

        if ($seconds < 60) {
            return "{$seconds}s";
        }

        if ($seconds < 3600) {
            return intdiv($seconds, 60).'m '.($seconds % 60).'s';
        }

        if ($seconds < 86400) {
            return intdiv($seconds, 3600).'h '.intdiv($seconds % 3600, 60).'m';
        }

        return intdiv($seconds, 86400).'d '.intdiv($seconds % 86400, 3600).'h';
    }
}
