<?php

declare(strict_types=1);

namespace App\Enums;

enum PaymentStatus: int
{
    case PENDING            = 1;
    case FINISHED           = 2;
    case FAILED             = 3;
    case PROCESSING         = 4;
    case CANCELLED          = 5;
    case REFUNDED           = 6;
    case PARTIALLY_REFUNDED = 7;
    case DISPUTED           = 8;
    case EXPIRED            = 9;

    public function label(): string
    {
        return match ($this) {
            self::PENDING            => 'pending',
            self::FINISHED           => 'finished',
            self::FAILED             => 'failed',
            self::PROCESSING         => 'processing',
            self::CANCELLED          => 'cancelled',
            self::REFUNDED           => 'refunded',
            self::PARTIALLY_REFUNDED => 'partially_refunded',
            self::DISPUTED           => 'disputed',
            self::EXPIRED            => 'expired',
        };
    }

    public static function fromString(string $status): self
    {
        return match (strtolower($status)) {
            'pending'                    => self::PENDING,
            'finished', 'success', 'succeeded' => self::FINISHED,
            'failed', 'declined'         => self::FAILED,
            'processing'                 => self::PROCESSING,
            'cancelled', 'canceled'      => self::CANCELLED,
            'refunded'                   => self::REFUNDED,
            'partially_refunded'         => self::PARTIALLY_REFUNDED,
            'disputed'                   => self::DISPUTED,
            'expired'                    => self::EXPIRED,
            default => throw new \InvalidArgumentException("Invalid status: {$status}"),
        };
    }
}
