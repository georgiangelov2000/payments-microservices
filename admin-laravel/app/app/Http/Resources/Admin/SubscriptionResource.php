<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class SubscriptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'monthly_fee' => (float) $this->monthly_fee,
            'transaction_fee_percent' => (float) $this->transaction_fee_percent,
            'transaction_fee_fixed' => (float) $this->transaction_fee_fixed,
            'included_transactions' => $this->included_transactions,
            'user_subscriptions_count' => $this->user_subscriptions_count,
        ];
    }
}
