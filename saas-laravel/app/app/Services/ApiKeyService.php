<?php

namespace App\Services;

use App\DTO\ApiKeysDTO;
use App\Repositories\ApiKeyRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ApiKeyService
{
    public function __construct(
        protected ApiKeyRepository $apiKeys
    ) {}

    public function getMerchantApiKeys(
        int $merchantId,
        int $perPage = 15
    ): LengthAwarePaginator {

        $paginator = $this->apiKeys->paginateByMerchant(
            merchantId: $merchantId,
            perPage: $perPage
        );

        return $paginator->through(
            fn ($apiKey) => ApiKeysDTO::fromModel($apiKey)->toArray()
        );
    }
}
