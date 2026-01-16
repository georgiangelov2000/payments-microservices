<?php

namespace App\Repositories;

use App\Models\ApiRequest;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ApiRequestRepository
{
    public function getByMerchantId(
        int $merchantId,
        int $perPage = 15
    ): LengthAwarePaginator {
        return ApiRequest::query()
            ->where('user_id', $merchantId)
            ->orderByDesc('ts')
            ->paginate($perPage);
    }
}
