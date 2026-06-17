<?php

declare(strict_types=1);

namespace App\Contracts\Merchants;

use App\Contracts\Repositories\CreatesRecordsInterface;
use App\Contracts\Repositories\FindsRecordsInterface;
use App\Contracts\Repositories\PaginatesRecordsInterface;
use App\Models\MerchantProviderCredential;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface MerchantRepositoryInterface extends PaginatesRecordsInterface, FindsRecordsInterface, CreatesRecordsInterface
{
    public function allForSelect(): Collection;

    public function update(User $merchant, array $data): User;

    public function upsertProviderCredential(string $merchantId, array $match, array $values): MerchantProviderCredential;

    public function updateProviderCredential(MerchantProviderCredential $credential, array $data): MerchantProviderCredential;
}
