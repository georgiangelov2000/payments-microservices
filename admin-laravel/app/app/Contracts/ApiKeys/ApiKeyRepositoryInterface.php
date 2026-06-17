<?php

declare(strict_types=1);

namespace App\Contracts\ApiKeys;

use App\Contracts\Repositories\CreatesRecordsInterface;
use App\Contracts\Repositories\FindsRecordsInterface;
use App\Contracts\Repositories\PaginatesRecordsInterface;
use App\Models\MerchantApiKey;

interface ApiKeyRepositoryInterface extends PaginatesRecordsInterface, FindsRecordsInterface, CreatesRecordsInterface
{
    public function update(MerchantApiKey $apiKey, array $data): MerchantApiKey;
}
