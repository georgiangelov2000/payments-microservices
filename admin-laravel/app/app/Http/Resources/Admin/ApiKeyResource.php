<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

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
            'masked_key' => $this->maskedKey(),
            'environment' => $this->environment ?: 'test',
            'scopes' => $this->scopes ?: [],
            'status' => $this->status?->label(),
            'merchant' => $this->merchant ? [
                'name' => $this->merchant->name,
                'email' => $this->merchant->email,
            ] : null,
            'last_rotated_at' => $this->last_rotated_at?->toDateTimeString(),
            'revoked_at' => $this->revoked_at?->toDateTimeString(),
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}
