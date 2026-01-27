<?php
declare(strict_types=1);

namespace App\Services;

use App\DTO\UserSubscriptionsDTO;
use App\Contracts\Subscriptions\SubscriptionRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;

final class SubscriptionService
{
    public function __construct(
        private readonly SubscriptionRepositoryInterface $subscriptionRepositoryInterface
    )
    {}

    public function fetchAll($params = []): LengthAwarePaginator
    {
        $perPage = $params["per_page"];

        $paginator = $this->subscriptionRepositoryInterface->fetchAll($params)
        ->latest('id')
        ->paginate($perPage);

        return $paginator->through(
            fn ($subscription) => UserSubscriptionsDTO::fromModel($subscription)->toArray()
        );
    }
}