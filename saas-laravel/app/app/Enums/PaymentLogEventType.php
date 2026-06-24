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
            self::EVENT_PAYMENT_CREATED            => __('messages.events.payment_created'),
            self::EVENT_PROVIDER_REQUEST_SENT      => __('messages.events.provider_request_sent'),
            self::EVENT_PROVIDER_PAYMENT_ACCEPTED  => __('messages.events.provider_status_update'),
            self::EVENT_MERCHANT_NOTIFICATION_SENT => __('messages.events.merchant_notified'),
            self::EVENT_PAYMENT_CANCELLED          => __('messages.events.payment_cancelled'),
            self::EVENT_PAYMENT_REFUNDED           => __('messages.events.payment_refunded'),
            self::EVENT_PAYMENT_EXPIRED            => __('messages.events.payment_expired'),
            self::EVENT_PAYMENT_DISPUTED           => __('messages.events.payment_disputed'),
        };
    }
}
