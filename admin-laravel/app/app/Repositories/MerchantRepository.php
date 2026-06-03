<?php
namespace App\Repositories;

use App\Contracts\Merchants\MerchantRepositoryInterface;
use App\Enums\Role;
use App\Models\MerchantProviderCredential;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

final class MerchantRepository implements MerchantRepositoryInterface
{
    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return User::query()
            ->where('role', Role::MERCHANT->value)
            ->with(['providerCredentials.provider:id,name,alias'])
            ->withCount(['payments', 'apiKeys', 'subscriptions'])
            ->latest()
            ->paginate($perPage);
    }

    public function allForSelect(): Collection
    {
        return User::query()
            ->where('role', Role::MERCHANT->value)
            ->with(['providerCredentials.provider:id,name,alias'])
            ->orderBy('name')
            ->get(['id', 'name', 'email']);
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
}
