<?php

declare(strict_types=1);

namespace App\Enums;

enum UserStatus: int
{
    case PENDING = 0;
    case ACTIVE = 1;
    case SUSPENDED = 2;
    case INACTIVE = 3;

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'pending',
            self::ACTIVE => 'active',
            self::SUSPENDED => 'suspended',
            self::INACTIVE => 'inactive',
        };
    }

    public static function fromLabel(string $label): self
    {
        return match ($label) {
            'active' => self::ACTIVE,
            'suspended' => self::SUSPENDED,
            'inactive' => self::INACTIVE,
            default => self::PENDING,
        };
    }
}
