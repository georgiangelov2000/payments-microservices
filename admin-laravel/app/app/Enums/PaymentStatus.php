<?php

namespace App\Enums;

enum PaymentStatus: int
{
    case PENDING  = 1;
    case FINISHED = 2;
    case FAILED   = 3;

    public function label(): string
    {
        return match ($this) {
            self::PENDING  => 'pending',
            self::FINISHED => 'finished',
            self::FAILED   => 'failed',
        };
    }

    public static function fromString(string $status): self
    {
        return match (strtolower($status)) {
            'pending'  => self::PENDING,
            'finished', 'success' => self::FINISHED,
            'failed'   => self::FAILED,
            default    => throw new \InvalidArgumentException("Invalid status: {$status}"),
        };
    }    
}
