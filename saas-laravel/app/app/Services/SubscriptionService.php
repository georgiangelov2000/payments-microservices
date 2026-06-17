<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Subscriptions\SubscriptionRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;

final class SubscriptionService
{
    public function __construct(
        private readonly SubscriptionRepositoryInterface $subscriptionRepositoryInterface
    ) {}

    public function fetchAll($params = []): LengthAwarePaginator
    {
        $perPage = $params['per_page'];

        return $this->subscriptionRepositoryInterface->fetchAll($params)
            ->with('subscription')
            ->latest('id')
            ->paginate($perPage);
    }
}
