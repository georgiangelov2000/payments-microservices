<?php

namespace App\Enums;

enum PaymentLogStatus: int
{
    case SUCCESS  = 1;
    case FAILED   = 2;
    case RETRYING = 3;
    case BLOCKED  = 4;

    public function label(): string
    {
        return match ($this) {
            self::SUCCESS  => 'Success',
            self::FAILED   => 'Failed',
            self::RETRYING => 'Retrying',
            self::BLOCKED  => 'Blocked',
        };
    }
}
