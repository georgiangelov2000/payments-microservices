<?php

declare(strict_types=1);

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

    public function whereEnvironment(?string $environment): self
    {
        if ($environment) {
            $this->query->where('environment', $environment);
        }

        return $this;
    }

    public function whereHash(?string $hash): self
    {
        if ($hash) {
            $this->query->where(function (Builder $query) use ($hash): void {
                $query
                    ->where('hash', 'ilike', "%{$hash}%")
                    ->orWhere('key_prefix', 'ilike', "%{$hash}%");
            });
        }

        return $this;
    }

    public function forMerchant(?string $merchantId): self
    {
        if ($merchantId === null) {
            throw new \InvalidArgumentException('Merchant ID is required.');
        }
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

    public function getQuery(): Builder
    {
        return $this->query;
    }
}
