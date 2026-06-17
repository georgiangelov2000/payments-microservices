<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class MerchantProviderCredentialResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'provider_id' => $this->provider_id,
            'provider_name' => $this->provider?->name,
            'provider_alias' => $this->provider?->alias,
            'environment' => $this->environment,
            'display_name' => $this->display_name,
            'public_key' => $this->maskedPublicKey(),
            'has_secret' => $this->hasSecret(),
            'status' => $this->status,
            'last_validated_at' => $this->last_validated_at?->toDateTimeString(),
        ];
    }
}
