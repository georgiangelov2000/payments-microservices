<?php

namespace App\DTO;

use App\Models\UserSubscription;

final class UserSubscriptionsDTO
{
    public function __construct(
        public int $id,
        public string $name,
        public int $tokens,
        public string $price,
        public int $usedTokens,
        public string $status,
    ) {}

    public static function fromModel(UserSubscription $userSubscription): self
    {
        return new self(
            id: $userSubscription->id,
            name: $userSubscription->subscription->name,
            tokens: $userSubscription->subscription->tokens,
            price: $userSubscription->subscription->price,
            usedTokens: $userSubscription->used_tokens,
            status: $userSubscription->status->value,
        );
    }
}
