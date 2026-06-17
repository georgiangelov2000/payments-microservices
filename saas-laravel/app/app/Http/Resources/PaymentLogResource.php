<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Support\PaymentWorkflowFormatter;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class PaymentLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'payment_id' => $this->payment_id,
            'event_type' => $this->event_type->value,
            'event_type_label' => $this->event_type->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'message' => $this->message,
            'payload' => $this->payload,
            'workflow_events' => PaymentWorkflowFormatter::eventsFromLog($this->resource),
            'created_at' => $this->created_at?->toISOString() ?? '',
        ];
    }
}
