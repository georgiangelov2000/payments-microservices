<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Support\PaymentWorkflowFormatter;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class PaymentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $logs = $this->relationLoaded('logs') ? $this->logs : collect();

        return [
            'id' => $this->id,
            'price' => (float) $this->price,
            'merchant_id' => $this->merchant_id,
            'order_id' => $this->order_id,
            'status' => $this->status->label(),
            'provider' => $this->provider?->name ?? 'Unknown provider',
            'provider_reference' => $this->provider_reference,
            'provider_checkout_url' => $this->provider_checkout_url,
            'currency' => $this->currency ?? 'USD',
            'country' => $this->country,
            'locale' => $this->locale,
            'channel' => $this->channel,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
            'provider_summary' => PaymentWorkflowFormatter::summaryForPayment($this->resource, $logs),
            'timing' => PaymentWorkflowFormatter::timingForPayment($this->resource, $logs),
            'workflow_timeline' => PaymentWorkflowFormatter::timelineFromLogs($logs),
        ];
    }
}
