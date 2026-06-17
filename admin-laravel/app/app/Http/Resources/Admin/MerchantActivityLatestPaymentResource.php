<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class MerchantActivityLatestPaymentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'amount' => (float) $this->price,
            'currency' => $this->currency ?: 'USD',
            'status' => $this->status?->label(),
            'provider' => $this->provider?->alias,
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
