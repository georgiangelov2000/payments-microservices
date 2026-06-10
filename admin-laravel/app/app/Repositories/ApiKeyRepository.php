<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\ApiKeys\ApiKeyRepositoryInterface;
use App\Models\MerchantApiKey;
use Illuminate\Pagination\LengthAwarePaginator;

final class ApiKeyRepository implements ApiKeyRepositoryInterface
{
    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        return MerchantApiKey::query()
            ->with('merchant:id,name,email')
            ->when($filters['search'] ?? null, function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'ilike', "%{$search}%")
                        ->orWhere('key_prefix', 'ilike', "%{$search}%")
                        ->orWhere('hash', 'ilike', "%{$search}%")
                        ->orWhereHas('merchant', function ($query) use ($search) {
                            $query->where('name', 'ilike', "%{$search}%")
                                ->orWhere('email', 'ilike', "%{$search}%");
                        });
                });
            })
            ->when($filters['merchant_id'] ?? null, fn ($query, string $merchantId) => $query->where('merchant_id', $merchantId))
            ->when($filters['environment'] ?? null, fn ($query, string $environment) => $query->where('environment', $environment))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', \App\Enums\MerchantAPIKeyStatus::fromString($status)->value))
            ->latest()
            ->paginate($perPage)
            ->withQueryString();
    }

    public function find(string $id): MerchantApiKey
    {
        return MerchantApiKey::query()->findOrFail($id);
    }

    public function create(array $data): MerchantApiKey
    {
        return MerchantApiKey::query()->create($data);
    }

    public function update(MerchantApiKey $apiKey, array $data): MerchantApiKey
    {
        $apiKey->update($data);

        return $apiKey->fresh();
    }
}
