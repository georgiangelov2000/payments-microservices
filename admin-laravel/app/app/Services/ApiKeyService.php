<?php
namespace App\Services;

use App\Contracts\ApiKeys\ApiKeyRepositoryInterface;
use App\Enums\MerchantAPIKeyStatus;
use App\Models\MerchantApiKey;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;

final class ApiKeyService
{
    private const SCOPES = [
        'payments:create',
        'payments:read',
        'refunds:create',
        'customers:read',
        'routing:test',
        'webhooks:manage',
    ];

    public function __construct(
        private readonly ApiKeyRepositoryInterface $apiKeyRepository,
    ) {}

    public function list(): LengthAwarePaginator
    {
        return $this->apiKeyRepository->paginate()->through(
            fn (MerchantApiKey $apiKey) => $this->serialize($apiKey)
        );
    }

    public function create(array $data): array
    {
        $plain = $this->generatePlainKey($data['environment']);

        $this->apiKeyRepository->create([
            'merchant_id' => $data['merchant_id'],
            'name' => $data['name'] ?: ucfirst($data['environment']) . ' gateway key',
            'environment' => $data['environment'],
            'hash' => hash('sha256', $plain),
            'key_prefix' => substr($plain, 0, 14),
            'status' => MerchantAPIKeyStatus::ACTIVE->value,
            'scopes' => array_values($data['scopes'] ?? ['payments:create', 'payments:read']),
            'last_rotated_at' => now(),
        ]);

        return ['plain_key' => $plain];
    }

    public function rotate(MerchantApiKey $apiKey): string
    {
        $plain = $this->generatePlainKey($apiKey->environment ?: 'test');

        $this->apiKeyRepository->update($apiKey, [
            'hash' => hash('sha256', $plain),
            'key_prefix' => substr($plain, 0, 14),
            'status' => MerchantAPIKeyStatus::ACTIVE->value,
            'last_rotated_at' => now(),
            'revoked_at' => null,
        ]);

        return $plain;
    }

    public function update(MerchantApiKey $apiKey, array $data): MerchantApiKey
    {
        return $this->apiKeyRepository->update($apiKey, [
            'name' => $data['name'] ?: $apiKey->name,
            'status' => MerchantAPIKeyStatus::fromString($data['status'])->value,
            'scopes' => array_values($data['scopes'] ?? []),
            'revoked_at' => $data['status'] === 'inactive' ? now() : null,
        ]);
    }

    public function revoke(MerchantApiKey $apiKey): MerchantApiKey
    {
        return $this->apiKeyRepository->update($apiKey, [
            'status' => MerchantAPIKeyStatus::INACTIVE->value,
            'revoked_at' => now(),
        ]);
    }

    public function availableScopes(): array
    {
        return self::SCOPES;
    }

    public function serialize(MerchantApiKey $apiKey): array
    {
        return [
            'id' => $apiKey->id,
            'name' => $apiKey->name,
            'masked_key' => $apiKey->maskedKey(),
            'environment' => $apiKey->environment ?: 'test',
            'scopes' => $apiKey->scopes ?: [],
            'status' => $apiKey->status?->label(),
            'merchant' => $apiKey->merchant ? [
                'name' => $apiKey->merchant->name,
                'email' => $apiKey->merchant->email,
            ] : null,
            'last_rotated_at' => $apiKey->last_rotated_at?->toDateTimeString(),
            'revoked_at' => $apiKey->revoked_at?->toDateTimeString(),
            'created_at' => $apiKey->created_at?->toDateTimeString(),
        ];
    }

    private function generatePlainKey(string $environment): string
    {
        $prefix = in_array($environment, ['live', 'production'], true) ? 'pk_live_' : 'pk_test_';
        return $prefix . Str::random(48);
    }
}
