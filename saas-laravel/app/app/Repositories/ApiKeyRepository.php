<?php

namespace App\Repositories;

use App\Builders\ApiKeysBuilder;
use App\Contracts\ApiKeys\ApiKeyRepositoryInterface;
use Illuminate\Database\Eloquent\Builder;

class ApiKeyRepository implements ApiKeyRepositoryInterface
{

   public function __construct() {}
   
    public function fetchAll(array $params = []): Builder
    {
        $merchantId = $params["merchant_id"] ?? null;
        $status = $params["status"] ?? null;
        
        return (new ApiKeysBuilder())
        ->forMerchant($merchantId)
        ->whereStatus($status)
        ->getQuery();
    }
}
