<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Enums\UserStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class MerchantActivityResource extends JsonResource
{
    /**
     * @return array{initials: string, color: string}
     */
    private function avatar(): array
    {
        $parts = preg_split('/\s+/', trim((string) $this->name)) ?: [];
        $initials = collect($parts)
            ->filter()
            ->take(2)
            ->map(fn (string $part): string => mb_strtoupper(mb_substr($part, 0, 1)))
            ->implode('');

        if ($initials === '') {
            $initials = mb_strtoupper(mb_substr((string) $this->email, 0, 2));
        }

        $colors = ['indigo', 'emerald', 'sky', 'violet', 'amber', 'rose', 'slate'];
        $index = abs(crc32((string) $this->id)) % count($colors);

        return [
            'initials' => $initials ?: 'M',
            'color' => $colors[$index],
        ];
    }

    private function statusLabel(): ?string
    {
        if ($this->status instanceof UserStatus) {
            return $this->status->label();
        }

        if ($this->status === null) {
            return null;
        }

        return UserStatus::tryFrom((int) $this->status)?->label();
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'status' => $this->statusLabel(),
            'logo_url' => $this->logo_url,
            'avatar' => $this->avatar(),
            'created_at' => $this->created_at?->toDateString(),
            'payments_count' => (int) $this->payments_count,
            'total_amount' => (float) $this->total_amount,
            'currency' => $this->currency ?: 'USD',
            'currencies_count' => (int) $this->currencies_count,
            'api_keys_count' => (int) $this->api_keys_count,
            'subscriptions_count' => (int) $this->subscriptions_count,
            'provider_credentials_count' => (int) $this->provider_credentials_count,
            'status_counts' => [
                'paid' => (int) $this->paid_count,
                'pending' => (int) $this->pending_count,
                'failed' => (int) $this->failed_count,
                'refunded' => (int) $this->refunded_count,
            ],
            'last_payment_at' => $this->last_payment_at,
            'latest_payment' => $this->latest_payment
                ? MerchantActivityLatestPaymentResource::make($this->latest_payment)->resolve($request)
                : null,
        ];
    }
}
