<?php

declare(strict_types=1);

namespace App\Enums;

enum PaymentLogEventType: int
{
    case EVENT_PAYMENT_CREATED            = 1;
    case EVENT_PROVIDER_REQUEST_SENT      = 2;
    case EVENT_PROVIDER_PAYMENT_ACCEPTED  = 3;
    case EVENT_MERCHANT_NOTIFICATION_SENT = 4;
    case EVENT_PAYMENT_CANCELLED          = 5;
    case EVENT_PAYMENT_REFUNDED           = 6;
    case EVENT_PAYMENT_EXPIRED            = 7;
    case EVENT_PAYMENT_DISPUTED           = 8;

    public function label(): string
    {
        return match ($this) {
            self::EVENT_PAYMENT_CREATED            => 'Payment created',
            self::EVENT_PROVIDER_REQUEST_SENT      => 'Provider request sent',
            self::EVENT_PROVIDER_PAYMENT_ACCEPTED  => 'Provider status update',
            self::EVENT_MERCHANT_NOTIFICATION_SENT => 'Merchant notified',
            self::EVENT_PAYMENT_CANCELLED          => 'Payment cancelled',
            self::EVENT_PAYMENT_REFUNDED           => 'Payment refunded',
            self::EVENT_PAYMENT_EXPIRED            => 'Payment expired',
            self::EVENT_PAYMENT_DISPUTED           => 'Payment disputed',
        };
    }
}
