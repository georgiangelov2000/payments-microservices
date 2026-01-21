<?php

namespace App\Enums;

enum MerchantAPIKeyStatus: int
{
    case ACTIVE   = 1;
    case INACTIVE = 0;

    public function label(): string
    {
        return strtolower($this->name);
    }

    public static function fromString(string $status): self
    {
        return match (strtolower($status)) {
            'active'   => self::ACTIVE,
            'inactive' => self::INACTIVE,
            default    => throw new \InvalidArgumentException("Invalid API key status: {$status}"),
        };
    }
}
