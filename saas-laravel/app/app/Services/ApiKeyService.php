<?php
declare(strict_types=1);

namespace App\Services;

use Illuminate\Pagination\LengthAwarePaginator;
use App\Contracts\ApiKeys\ApiKeyRepositoryInterface;
use App\DTO\ApiKeysDTO;

class ApiKeyService
{
    public function __construct(
        private readonly ApiKeyRepositoryInterface $apiKeyRepositoryInterface
    ) {}


    public function fetchAll($params = []): LengthAwarePaginator {
        $perPage = $params["per_page"];

        $paginator = $this->apiKeyRepositoryInterface->fetchAll($params)
            ->latest('id')
            ->paginate($perPage);

        return $paginator->through(
            fn ($apiKey) => ApiKeysDTO::fromModel($apiKey)->toArray()
        );
    }
}
