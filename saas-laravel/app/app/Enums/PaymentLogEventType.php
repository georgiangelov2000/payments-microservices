<?php

namespace App\Enums;

enum PaymentLogEventType: int
{
    case PAYMENT_CREATED                  = 1;
    case EVENT_PROVIDER_REQUEST_SENT      = 2;
    case EVENT_PROVIDER_PAYMENT_ACCEPTED  = 3;
    case EVENT_MERCHANT_NOTIFICATION_SENT = 4;
    case MESSAGE_BROKER_MESSAGES          = 5;

    public function label(): string
    {
        return match ($this) {
            self::PAYMENT_CREATED =>
                'Payment created',

            self::EVENT_PROVIDER_REQUEST_SENT =>
                'Provider request sent',

            self::EVENT_PROVIDER_PAYMENT_ACCEPTED =>
                'Provider accepted payment',

            self::EVENT_MERCHANT_NOTIFICATION_SENT =>
                'Merchant notified',

            self::MESSAGE_BROKER_MESSAGES =>
                'Message queued for async processing',
        };
    }
}
