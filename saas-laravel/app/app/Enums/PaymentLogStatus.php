<?php

namespace App\Enums;

enum PaymentLogStatus: int
{
    case PENDING   = 1;
    case SUCCESS   = 2;
    case FAILED    = 3;
    case RETRYING  = 4;
    case BLOCKED   = 5;

    public function label(): string
    {
        return match ($this) {
            self::PENDING  => 'Pending',
            self::SUCCESS  => 'Successful',
            self::FAILED   => 'Failed',
            self::RETRYING => 'Retrying',
            self::BLOCKED  => 'Blocked',
        };
    }
}
