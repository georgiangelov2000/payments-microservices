<?php

namespace App\DTO;

use App\Models\ApiRequest;

final class ApiRequestsDTO
{
    public function __construct(
        public int $id,
        public string $event_id,
        public int $subscription_id,
        public ?string $subscription_name,
        public ?int $payment_id,
        public ?int $order_id,
        public float $amount,
        public string $source,
        public string $created_at,
    ) {}

    public static function fromModel(ApiRequest $request): self
    {
        return new self(
            id: $request->id,
            event_id: $request->event_id,
            subscription_id: $request->subscription_id,
            subscription_name: $request->subscription?->name,
            payment_id: $request->payment_id,
            order_id: $request->payment?->order_id,
            amount: (float) $request->amount,
            source: $request->source,
            created_at: $request->created_at->toISOString(),
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'event_id' => $this->event_id,
            'subscription_id' => $this->subscription_id,
            'subscription_name' => $this->subscription_name,
            'payment_id' => $this->payment_id,
            'order_id' => $this->order_id,
            'amount' => $this->amount,
            'source' => $this->source,
            'created_at' => $this->created_at,
        ];
    }
}
