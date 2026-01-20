<?php

namespace App\Enums;

enum PaymentLogEventStatus: int
{
    case PAYMENT_CREATED               = 1;
    case PROVIDER_PAYMENT_ACCEPTED     = 2;
    case MERCHANT_NOTIFICATION_SENT    = 3;
    case MERCHANT_NOTIFICATION_FAILED  = 4;

    public function label(): string
    {
        return match ($this) {
            self::PAYMENT_CREATED =>
                'Payment created',

            self::PROVIDER_PAYMENT_ACCEPTED =>
                'Provider accepted payment',

            self::MERCHANT_NOTIFICATION_SENT =>
                'Merchant notification sent',

            self::MERCHANT_NOTIFICATION_FAILED =>
                'Merchant notification failed',
        };
    }
}
