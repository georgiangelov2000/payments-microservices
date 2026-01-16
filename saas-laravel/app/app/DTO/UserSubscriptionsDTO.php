<?php

namespace App\DTO;

use App\Models\UserSubscription;

final class UserSubscriptionsDTO
{
    public function __construct(
        public int $id,
        public string $name,
        public int $tokens,
        public float $price,
        public int $usedTokens,
        public string $status,
    ) {}

    public static function fromModel(UserSubscription $userSubscription): self
    {
        return new self(
            id: $userSubscription->id,
            name: $userSubscription->subscription->name,
            tokens: $userSubscription->subscription->tokens,
            price: (float) $userSubscription->subscription->price,
            usedTokens: $userSubscription->used_tokens,
            status: $userSubscription->status->value,
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'tokens' => $this->tokens,
            'price' => $this->price,
            'used_tokens' => $this->usedTokens,
            'status' => $this->status,
        ];
    }
}
