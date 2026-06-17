<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class PaymentRoutingAttemptResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'provider_alias' => $this->provider_alias,
            'attempt_number' => $this->attempt_number,
            'status' => $this->status,
            'error_code' => $this->error_code,
            'error_message' => $this->error_message,
            'latency_ms' => $this->latency_ms,
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
