<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case pending = 'pending';
    case finished = 'finished';
    case failed = 'failed';
}
