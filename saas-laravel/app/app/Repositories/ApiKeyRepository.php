<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Builders\ApiKeysBuilder;
use App\Contracts\ApiKeys\ApiKeyRepositoryInterface;
use Illuminate\Database\Eloquent\Builder;

class ApiKeyRepository implements ApiKeyRepositoryInterface
{
    public function __construct() {}

    public function fetchAll(array $params = []): Builder
    {
        $merchantId = $params['merchant_id'] ?? null;
        $status = $params['status'] ?? null;
        $environment = $params['environment'] ?? null;
        $hash = $params['hash'] ?? null;

        return (new ApiKeysBuilder)
            ->forMerchant($merchantId)
            ->whereHash($hash)
            ->whereEnvironment($environment)
            ->whereStatus($status)
            ->getQuery();
    }
}
