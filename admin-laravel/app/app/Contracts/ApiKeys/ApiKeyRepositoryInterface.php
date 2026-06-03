<?php
namespace App\Contracts\ApiKeys;

use App\Models\MerchantApiKey;
use Illuminate\Pagination\LengthAwarePaginator;

interface ApiKeyRepositoryInterface
{
    public function paginate(int $perPage = 15): LengthAwarePaginator;
    public function find(string $id): MerchantApiKey;
    public function create(array $data): MerchantApiKey;
    public function update(MerchantApiKey $apiKey, array $data): MerchantApiKey;
}
