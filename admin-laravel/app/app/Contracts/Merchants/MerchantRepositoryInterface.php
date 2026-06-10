<?php

declare(strict_types=1);

namespace App\Contracts\Merchants;

use App\Models\MerchantProviderCredential;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface MerchantRepositoryInterface
{
    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator;

    public function allForSelect(): Collection;

    public function find(string $id): User;

    public function create(array $data): User;

    public function update(User $merchant, array $data): User;

    public function upsertProviderCredential(string $merchantId, array $match, array $values): MerchantProviderCredential;

    public function updateProviderCredential(MerchantProviderCredential $credential, array $data): MerchantProviderCredential;
}
