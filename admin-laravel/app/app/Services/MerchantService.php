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
use Illuminate\Support\Facades\Storage;

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
        $logo = $data['logo'] ?? null;
        unset($data['logo']);

        $merchant = $this->merchantRepository->create([
            'name' => $data['name'],
            'company_name' => $data['company_name'] ?? null,
            'legal_name' => $data['legal_name'] ?? null,
            'website' => $data['website'] ?? null,
            'phone' => $data['phone'] ?? null,
            'tax_id' => $data['tax_id'] ?? null,
            'country' => isset($data['country']) ? strtoupper($data['country']) : null,
            'city' => $data['city'] ?? null,
            'postal_code' => $data['postal_code'] ?? null,
            'address_line1' => $data['address_line1'] ?? null,
            'address_line2' => $data['address_line2'] ?? null,
            'email' => $data['email'],
            'password' => Hash::make(str()->random(32)),
            'role' => Role::MERCHANT->value,
            'status' => UserStatus::fromLabel($data['status'])->value,
        ]);

        if ($logo) {
            $path = $logo->store("merchant-logos/{$merchant->id}", 'public');
            $merchant->update(['logo_url' => Storage::disk('public')->url($path)]);
        }

        return $merchant->fresh();
    }

    public function update(User $merchant, array $data): User
    {
        $logo = $data['logo'] ?? null;
        $removeLogo = (bool) ($data['remove_logo'] ?? false);
        unset($data['logo'], $data['remove_logo']);

        if (isset($data['status'])) {
            $data['status'] = UserStatus::fromLabel($data['status'])->value;
        }

        if (isset($data['country'])) {
            $data['country'] = strtoupper($data['country']);
        }

        if ($removeLogo) {
            $this->deleteLocalLogo($merchant->logo_url);
            $data['logo_url'] = null;
        }

        if ($logo) {
            $this->deleteLocalLogo($merchant->logo_url);
            $path = $logo->store("merchant-logos/{$merchant->id}", 'public');
            $data['logo_url'] = Storage::disk('public')->url($path);
        }

        return $this->merchantRepository->update($merchant, $data);
    }

    private function deleteLocalLogo(?string $logoUrl): void
    {
        $path = parse_url((string) $logoUrl, PHP_URL_PATH);
        $prefix = '/storage/';

        if (is_string($path) && str_starts_with($path, $prefix)) {
            Storage::disk('public')->delete(substr($path, strlen($prefix)));
        }
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
