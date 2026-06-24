<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class MerchantResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'company_name' => $this->company_name,
            'legal_name' => $this->legal_name,
            'logo_url' => $this->logo_url,
            'website' => $this->website,
            'phone' => $this->phone,
            'tax_id' => $this->tax_id,
            'country' => $this->country,
            'city' => $this->city,
            'postal_code' => $this->postal_code,
            'address_line1' => $this->address_line1,
            'address_line2' => $this->address_line2,
            'email' => $this->email,
            'status' => $this->status->label(),
            'payments_count' => $this->payments_count,
            'api_keys_count' => $this->api_keys_count,
            'subscriptions_count' => $this->subscriptions_count,
            'created_at' => $this->created_at?->toDateString(),
            'provider_credentials' => MerchantProviderCredentialResource::collection($this->providerCredentials)->resolve($request),
            'api_keys' => $this->relationLoaded('apiKeys')
                ? MerchantApiKeyResource::collection($this->apiKeys)->resolve($request)
                : [],
        ];
    }
}
