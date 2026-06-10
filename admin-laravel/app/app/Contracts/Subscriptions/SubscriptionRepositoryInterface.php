<?php

declare(strict_types=1);

namespace App\Contracts\Subscriptions;

use Illuminate\Pagination\LengthAwarePaginator;

interface SubscriptionRepositoryInterface
{
    public function paginate(int $perPage = 15): LengthAwarePaginator;
}
