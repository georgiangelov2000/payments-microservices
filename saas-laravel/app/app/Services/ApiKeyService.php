<?php
declare(strict_types=1);

namespace App\Services;

use Illuminate\Pagination\LengthAwarePaginator;
use App\Contracts\ApiKeys\ApiKeyRepositoryInterface;
use App\DTO\ApiKeysDTO;
use App\Enums\MerchantAPIKeyStatus;
use App\Models\MerchantApiKey;

class ApiKeyService
{
    public function __construct(
        private readonly ApiKeyRepositoryInterface $apiKeyRepositoryInterface,
        private readonly GatewayAccessProfileService $gatewayAccessProfileService,
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

    public function generateForMerchant(string $merchantId): string
    {
        $plainTextKey = 'pgw_test_' . bin2hex(random_bytes(24));
        $hash = hash_hmac('sha256', $plainTextKey, config('services.gateway.hmac_secret'));

        \Illuminate\Support\Facades\DB::transaction(function () use ($merchantId, $hash, &$apiKey) {
            $apiKey = MerchantApiKey::create([
                'merchant_id' => $merchantId,
                'hash'        => $hash,
                'status'      => MerchantAPIKeyStatus::ACTIVE,
            ]);

            $this->gatewayAccessProfileService->syncApiKey($apiKey);
        });

        return $plainTextKey;
    }
}
