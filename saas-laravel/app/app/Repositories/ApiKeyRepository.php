<?php

namespace App\Repositories;

use App\Models\MerchantApiKey;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ApiKeyRepository
{
    public function paginateByMerchant(
        int $merchantId,
        int $perPage = 15
    ): LengthAwarePaginator {
        return MerchantApiKey::where('merchant_id', $merchantId)
            ->latest()
            ->paginate($perPage);
    }
}
