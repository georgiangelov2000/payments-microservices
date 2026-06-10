<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Subscriptions\SubscriptionRepositoryInterface;
use App\Models\Subscription;
use Illuminate\Pagination\LengthAwarePaginator;

final class SubscriptionRepository implements SubscriptionRepositoryInterface
{
    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return Subscription::query()
            ->select([
                'id', 'name', 'code', 'monthly_fee',
                'transaction_fee_percent', 'transaction_fee_fixed', 'included_transactions',
            ])
            ->withCount('userSubscriptions')
            ->orderBy('name')
            ->paginate($perPage);
    }
}
