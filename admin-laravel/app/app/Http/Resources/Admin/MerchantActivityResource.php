<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class MerchantActivityResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'payments_count' => (int) $this->payments_count,
            'total_amount' => (float) $this->total_amount,
            'currency' => $this->currency ?: 'USD',
            'currencies_count' => (int) $this->currencies_count,
            'status_counts' => [
                'paid' => (int) $this->paid_count,
                'pending' => (int) $this->pending_count,
                'failed' => (int) $this->failed_count,
                'refunded' => (int) $this->refunded_count,
            ],
            'last_payment_at' => $this->last_payment_at,
            'latest_payment' => $this->latest_payment
                ? MerchantActivityLatestPaymentResource::make($this->latest_payment)->resolve($request)
                : null,
        ];
    }
}
