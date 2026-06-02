<?php

namespace App\DTO;

use App\Models\MerchantApiKey;
use Carbon\CarbonInterface;

final class ApiKeysDTO
{
    public function __construct(
        public string $id,
        public string $merchant_id,
        public string $status,
        public CarbonInterface $created_at,
    ) {}

    public static function fromModel(MerchantApiKey $apiKey): self
    {
        return new self(
            id: $apiKey->id,
            merchant_id: $apiKey->merchant_id,
            status: $apiKey->status->label(),
            created_at: $apiKey->created_at,
        );
    }

    public function toArray(): array
    {
        return [
            'id'         => $this->id,
            'merchant_id'=> $this->merchant_id,
            'status'     => $this->status,
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
