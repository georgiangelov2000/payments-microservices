<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\ApiKeys\ApiKeyRepositoryInterface;
use App\Models\MerchantApiKey;
use Illuminate\Pagination\LengthAwarePaginator;

final class ApiKeyRepository implements ApiKeyRepositoryInterface
{
    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return MerchantApiKey::query()
            ->with('merchant:id,name,email')
            ->latest()
            ->paginate($perPage);
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
