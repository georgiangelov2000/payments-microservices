<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

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
            'event_type' => $this->event_type?->label(),
            'status' => $this->status?->label(),
            'message' => $this->message,
            'payload' => $this->payload,
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
