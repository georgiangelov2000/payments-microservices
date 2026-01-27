<?php
namespace App\Repositories;

use App\Builders\UserSubscriptionsBuilder;
use App\Contracts\Subscriptions\SubscriptionRepositoryInterface;
use Illuminate\Database\Eloquent\Builder;

final class SubscriptionRepository implements SubscriptionRepositoryInterface
{
    public function fetchAll(array $params = []): Builder
    {
        $status = $params["status"] ?? null;
        $merchantId = $params["merchant_id"] ?? null;
        $plan = $params["plan"] ?? null;

        return (new UserSubscriptionsBuilder())
            ->forMerchant($merchantId)
            ->whereStatus($status)
            ->wherePlan($plan)
            ->getQuery();
    }

}