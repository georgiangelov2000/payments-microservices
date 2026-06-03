<?php

declare(strict_types=1);

namespace App\Enums;

enum Role: int
{
    case ADMIN = 1;
    case MERCHANT = 2;
}
