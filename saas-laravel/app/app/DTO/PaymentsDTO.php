<?php

namespace App\DTO;

use App\Models\Payment;
use Carbon\CarbonInterface;
use App\Enums\PaymentStatus;

final class PaymentsDTO
{
    public function __construct(
        public int $id,
        public float $price,
        public int $merchant_id,
        public int $order_id,
        public string $status,
        public string $provider,
        public CarbonInterface $created_at,
    ) {}

    public static function fromModel(Payment $payment): self
    {
        return new self(
            id: $payment->id,
            price: (float) $payment->price,
            merchant_id: $payment->merchant_id,
            order_id: $payment->order_id,
            status: $payment->status->label(),
            provider: $payment->provider->name,
            created_at: $payment->created_at,
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'price' => $this->price,
            'merchant_id' => $this->merchant_id,
            'order_id' => $this->order_id,
            'status' => $this->status,
            'provider' => $this->provider,
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
