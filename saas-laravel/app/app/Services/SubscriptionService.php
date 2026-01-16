<?php

namespace App\Services;

use App\DTO\UserSubscriptionsDTO;
use App\Repositories\SubscriptionRepository;
use Illuminate\Pagination\LengthAwarePaginator;

final class SubscriptionService
{
    protected readonly SubscriptionRepository $subscriptions;

    public function __construct(SubscriptionRepository $subscriptions)
    {
        $this->subscriptions = $subscriptions;
    }

    public function getMerchantSubscriptions(int $merchantId, int $perPage = 15): LengthAwarePaginator
    {
        $paginator = $this->subscriptions->getByMerchantId(
            merchantId: $merchantId,
            perPage: $perPage
        );

        $paginator->getCollection()->transform(
            fn ($subscription) => UserSubscriptionsDTO::fromModel($subscription)
        );

        return $paginator;
    }
}