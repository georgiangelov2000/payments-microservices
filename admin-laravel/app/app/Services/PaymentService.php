<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Payments\PaymentRepositoryInterface;
use App\Models\Payment;
use App\Models\PaymentLog;
use App\Models\PaymentRoutingAttempt;
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

    public function serialize(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'order_id' => $payment->order_id,
            'price' => (float) $payment->price,
            'status' => $payment->status?->label(),
            'provider_status' => $payment->provider_status,
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
