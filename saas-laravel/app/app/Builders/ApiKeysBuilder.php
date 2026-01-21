<?php

namespace App\Builders;

use App\Models\MerchantApiKey;
use Illuminate\Database\Eloquent\Builder;

class ApiKeysBuilder
{
    protected Builder $query;

    public function __construct()
    {
        $this->query = MerchantApiKey::query();
    }

    public function whereStatus(?string $status): self
    {
        if ($status) {
            $this->query->where('status', $status);
        }

        return $this;
    }

    public function forMerchant(?string $merchantId): self
    {
        $this->query->where('merchant_id', $merchantId);
        return $this;
    }

    public function paginate(int $perPage = 15)
    {
        return $this->query->paginate($perPage);
    }

    public function latest(): self
    {
        $this->query->latest();
        return $this;
    }    
}
