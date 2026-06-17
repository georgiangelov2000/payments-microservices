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
        return $this->merchantRepository->paginate(filters: $filters);
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
        return $this->merchantRepository->upsertProviderCredential(
            $merchant->id,
            ['provider_id' => $data['provider_id'], 'environment' => $data['environment']],
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

        return $this->merchantRepository->updateProviderCredential($credential, $updates);
    }

}
