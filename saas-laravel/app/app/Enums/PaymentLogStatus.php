<?php

declare(strict_types=1);

namespace App\Enums;

enum PaymentLogStatus: int
{
    case PENDING = 1;
    case SUCCESS = 2;
    case FAILED = 3;
    case RETRYING = 4;
    case BLOCKED = 5;
    case PROCESSING = 6;

    public function label(): string
    {
        return match ($this) {
            self::PENDING => __('messages.log_statuses.pending'),
            self::SUCCESS => __('messages.log_statuses.successful'),
            self::FAILED => __('messages.log_statuses.failed'),
            self::RETRYING => __('messages.log_statuses.retrying'),
            self::BLOCKED => __('messages.log_statuses.blocked'),
            self::PROCESSING => __('messages.log_statuses.processing')
        };
    }
}
