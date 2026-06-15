<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Payments\PaymentRepositoryInterface;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\PaymentLog;
use App\Models\PaymentRoutingAttempt;
use Carbon\CarbonImmutable;
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
}
