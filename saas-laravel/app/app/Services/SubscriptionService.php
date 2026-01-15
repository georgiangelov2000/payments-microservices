<?php
namespace App\Services;
use App\Repositories\SubscriptionRepository;

class SubscriptionService
{
    protected SubscriptionRepository $subscriptions;

    public function __construct(SubscriptionRepository $subscriptions)
    {
        $this->subscriptions = $subscriptions;
    }

    public function getMerchantSubscriptions(int $merchantId, int $perPage = 15)
    {
        return $this->subscriptions->getByMerchantId(
            merchantId: $merchantId,
            perPage: $perPage
        );
    }
}