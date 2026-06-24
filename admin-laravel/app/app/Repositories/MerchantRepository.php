<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Merchants\MerchantRepositoryInterface;
use App\Enums\Role;
use App\Models\MerchantProviderCredential;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

final class MerchantRepository implements MerchantRepositoryInterface
{
    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        return User::query()
            ->where('role', Role::MERCHANT->value)
            ->when($filters['search'] ?? null, function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'ilike', "%{$search}%")
                        ->orWhere('company_name', 'ilike', "%{$search}%")
                        ->orWhere('legal_name', 'ilike', "%{$search}%")
                        ->orWhere('email', 'ilike', "%{$search}%");
                });
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', \App\Enums\UserStatus::fromLabel($status)->value))
            ->with(['providerCredentials.provider:id,name,alias'])
            ->withCount(['payments', 'apiKeys', 'subscriptions'])
            ->latest()
            ->paginate($perPage)
            ->withQueryString();
    }

    public function allForSelect(): Collection
    {
        return User::query()
            ->where('role', Role::MERCHANT->value)
            ->with(['providerCredentials.provider:id,name,alias'])
            ->orderBy('name')
            ->get(['id', 'name', 'company_name', 'logo_url', 'email']);
    }

    public function find(string $id): User
    {
        return User::query()->findOrFail($id);
    }

    public function create(array $data): User
    {
        return User::query()->create($data);
    }

    public function update(User $merchant, array $data): User
    {
        $merchant->update($data);

        return $merchant->fresh();
    }

    public function upsertProviderCredential(string $merchantId, array $match, array $values): MerchantProviderCredential
    {
        return MerchantProviderCredential::query()->updateOrCreate(
            array_merge(['merchant_id' => $merchantId], $match),
            $values
        );
    }

    public function updateProviderCredential(MerchantProviderCredential $credential, array $data): MerchantProviderCredential
    {
        $credential->update($data);

        return $credential->fresh();
    }
}
