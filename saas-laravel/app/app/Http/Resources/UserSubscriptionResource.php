<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class UserSubscriptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->subscription->name,
            'monthly_fee' => (float) $this->subscription->monthly_fee,
            'transaction_fee_percent' => (float) $this->subscription->transaction_fee_percent,
            'transaction_fee_fixed' => (float) $this->subscription->transaction_fee_fixed,
            'included_transactions' => (int) $this->subscription->included_transactions,
            'current_period_transactions' => (int) $this->current_period_transactions,
            'current_period_volume' => (float) $this->current_period_volume,
            'status' => $this->status->label(),
        ];
    }
}
