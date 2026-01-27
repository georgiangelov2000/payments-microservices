<?php

namespace App\Enums;

enum SubscriptionStatus: int
{
    case ACTIVE   = 1;
    case INACTIVE = 2;

    public function label(): string
    {
        return strtolower($this->name); // "active" / "inactive"
    }

    public static function fromString(string $status): self
    {
        return match (strtolower($status)) {
            'active'   => self::ACTIVE,
            'inactive' => self::INACTIVE,
            default    => throw new \InvalidArgumentException("Invalid subscription status: {$status}"),
        };
    }
}
