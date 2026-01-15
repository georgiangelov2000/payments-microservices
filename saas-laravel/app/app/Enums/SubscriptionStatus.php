<?php

namespace App\Enums;

enum SubscriptionStatus: string
{
    case active = 'active';
    case inactive = 'inactive';
}