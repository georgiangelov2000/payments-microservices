<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Merchants\MerchantRepositoryInterface;
use App\Enums\Role;
use App\Enums\UserStatus;
use App\Models\MerchantProviderCredential;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;

final class MerchantService
{
    public function __construct(
        private readonly MerchantRepositoryInterface $merchantRepository,
    ) {}

    public function list(array $filters = []): LengthAwarePaginator
    {
        return $this->merchantRepository->paginate(filters: $filters)->through(
            fn (User $merchant) => $this->serialize($merchant)
        );
    }

    public function create(array $data): User
    {
        return $this->merchantRepository->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make(str()->random(32)),
            'role' => Role::MERCHANT->value,
            'status' => UserStatus::fromLabel($data['status'])->value,
        ]);
    }

    public function update(User $merchant, array $data): User
    {
        if (isset($data['status'])) {
            $data['status'] = UserStatus::fromLabel($data['status'])->value;
        }

        return $this->merchantRepository->update($merchant, $data);
    }

    public function assignProvider(User $merchant, array $data): MerchantProviderCredential
    {
        return MerchantProviderCredential::query()->updateOrCreate(
            [
                'merchant_id' => $merchant->id,
                'provider_id' => $data['provider_id'],
                'environment' => $data['environment'],
            ],
            [
                'display_name' => $data['display_name'] ?: null,
                'public_key' => $data['public_key'] ?: null,
                'secret_value' => $data['secret_value'] ?: null,
                'status' => $data['status'],
                'last_validated_at' => in_array($data['status'], ['active', 'validated'], true) ? now() : null,
            ]
        );
    }

    public function updateProviderCredential(MerchantProviderCredential $credential, array $data): MerchantProviderCredential
    {
        $status = $data['status'];
        $updates = [
            'status' => $status,
            'last_validated_at' => in_array($status, ['active', 'validated'], true) ? now() : $credential->last_validated_at,
        ];

        if (array_key_exists('display_name', $data)) {
            $updates['display_name'] = $data['display_name'] ?: null;
        }

        if (filled($data['public_key'] ?? null)) {
            $updates['public_key'] = $data['public_key'];
        }

        if (filled($data['secret_value'] ?? null)) {
            $updates['secret_value'] = $data['secret_value'];
            $updates['last_rotated_at'] = now();
        }

        $credential->update($updates);

        return $credential->fresh();
    }

    public function serialize(User $merchant): array
    {
        return [
            'id' => $merchant->id,
            'name' => $merchant->name,
            'email' => $merchant->email,
            'status' => $merchant->status->label(),
            'payments_count' => $merchant->payments_count,
            'api_keys_count' => $merchant->api_keys_count,
            'subscriptions_count' => $merchant->subscriptions_count,
            'created_at' => $merchant->created_at?->toDateString(),
            'provider_credentials' => $merchant->providerCredentials->map(
                fn (MerchantProviderCredential $credential) => [
                    'id' => $credential->id,
                    'provider_id' => $credential->provider_id,
                    'provider_name' => $credential->provider?->name,
                    'provider_alias' => $credential->provider?->alias,
                    'environment' => $credential->environment,
                    'display_name' => $credential->display_name,
                    'public_key' => $credential->maskedPublicKey(),
                    'has_secret' => $credential->hasSecret(),
                    'status' => $credential->status,
                    'last_validated_at' => $credential->last_validated_at?->toDateTimeString(),
                ]
            )->all(),
            'api_keys' => ($merchant->relationLoaded('apiKeys') ? $merchant->apiKeys : collect())->map(
                fn ($key) => [
                    'id' => $key->id,
                    'name' => $key->name,
                    'key_prefix' => $key->key_prefix,
                    'environment' => $key->environment,
                    'status' => $key->status?->label() ?? $key->status,
                    'scopes' => $key->scopes ?? [],
                    'last_rotated_at' => $key->last_rotated_at?->toDateTimeString(),
                    'revoked_at' => $key->revoked_at?->toDateTimeString(),
                ]
            )->all(),
        ];
    }
}
