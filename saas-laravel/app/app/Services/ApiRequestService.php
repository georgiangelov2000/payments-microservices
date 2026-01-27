<?php
declare(strict_types=1);

namespace App\Services;

use App\Contracts\ApiRequests\ApiRequestsRepositoryInterface;
use App\DTO\ApiRequestsDTO;
use Illuminate\Pagination\LengthAwarePaginator;

final class ApiRequestService
{
    public function __construct(
        private readonly ApiRequestsRepositoryInterface $apiRequestRepositoryInterface
    ) {}

    public function fetchAll(array $params = []): LengthAwarePaginator
    {
        $apiRequests = $this->apiRequestRepositoryInterface
            ->fetchAll($params)
            ->latest('id')
            ->paginate($params['per_page']);

        $apiRequests = $apiRequests->through(
            fn ($apiRequest) => ApiRequestsDTO::fromModel($apiRequest)->toArray()
        );

        return $apiRequests;
    }
}
