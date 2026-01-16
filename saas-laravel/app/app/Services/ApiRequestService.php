<?php

namespace App\Services;

use App\DTO\ApiRequestsDTO;
use App\Repositories\ApiRequestRepository;
use Illuminate\Pagination\LengthAwarePaginator;

class ApiRequestService
{
    protected ApiRequestRepository $apiRequestRepository;

    public function __construct(ApiRequestRepository $apiRequestRepository)
    {
        $this->apiRequestRepository = $apiRequestRepository;
    }

    public function getMerchantApiRequests(
        int $merchantId,
        int $perPage = 15
    ): LengthAwarePaginator {
        return $this->apiRequestRepository
            ->getByMerchantId(
                merchantId: $merchantId,
                perPage: $perPage
            )
            ->through(
                fn ($apiRequest) => ApiRequestsDTO::fromModel($apiRequest)->toArray()
            );
    }
}
