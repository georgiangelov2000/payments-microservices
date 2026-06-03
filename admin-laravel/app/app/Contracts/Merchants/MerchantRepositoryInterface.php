<?php
namespace App\Contracts\Merchants;

use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface MerchantRepositoryInterface
{
    public function paginate(int $perPage = 15): LengthAwarePaginator;
    public function allForSelect(): Collection;
    public function find(string $id): User;
    public function create(array $data): User;
    public function update(User $merchant, array $data): User;
}
