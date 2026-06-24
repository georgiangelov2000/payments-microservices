<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ApiKeyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'merchant_id' => $this->merchant_id,
            'hash' => $this->hash,
            'masked_key' => $this->maskedKey(),
            'environment' => $this->environment ?: 'test',
            'scopes' => $this->scopes ?: [],
            'status' => $this->status->label(),
            'last_rotated_at' => $this->last_rotated_at?->toDateTimeString(),
            'revoked_at' => $this->revoked_at?->toDateTimeString(),
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
