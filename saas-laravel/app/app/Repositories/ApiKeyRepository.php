<?php

namespace App\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use App\Builders\ApiKeysBuilder;
use App\Enums\MerchantAPIKeyStatus;

class ApiKeyRepository
{

    public function __construct(
        protected ApiKeysBuilder $apiKeyBuilder
    )
    {}

    public function paginateByMerchant(
        int $merchantId,
        int $perPage = 15,
        array $filters = []
    ): LengthAwarePaginator {

        if (!empty($filters['status'])) {
            $filters['status'] = MerchantAPIKeyStatus::fromString($filters['status'])->value;
        }

        return (new ApiKeysBuilder())
            ->forMerchant($merchantId)
            ->whereStatus($filters['status'] ?? null)
            ->latest()
            ->paginate($perPage);
    }
}
