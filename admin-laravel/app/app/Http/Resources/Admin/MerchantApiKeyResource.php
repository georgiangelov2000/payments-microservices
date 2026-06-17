<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class MerchantApiKeyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'key_prefix' => $this->key_prefix,
            'environment' => $this->environment,
            'status' => $this->status?->label() ?? $this->status,
            'scopes' => $this->scopes ?? [],
            'last_rotated_at' => $this->last_rotated_at?->toDateTimeString(),
            'revoked_at' => $this->revoked_at?->toDateTimeString(),
        ];
    }
}
