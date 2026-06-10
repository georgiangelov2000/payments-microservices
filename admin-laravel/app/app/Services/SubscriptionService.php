<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Subscriptions\SubscriptionRepositoryInterface;
use App\Models\Subscription;
use Illuminate\Pagination\LengthAwarePaginator;

final class SubscriptionService
{
    public function __construct(
        private readonly SubscriptionRepositoryInterface $repository,
    ) {}

    public function paginate(): LengthAwarePaginator
    {
        return $this->repository->paginate()->through(
            fn (Subscription $sub) => $this->serialize($sub)
        );
    }

    public function serialize(Subscription $sub): array
    {
        return [
            'id' => $sub->id,
            'name' => $sub->name,
            'code' => $sub->code,
            'monthly_fee' => (float) $sub->monthly_fee,
            'transaction_fee_percent' => (float) $sub->transaction_fee_percent,
            'transaction_fee_fixed' => (float) $sub->transaction_fee_fixed,
            'included_transactions' => $sub->included_transactions,
            'user_subscriptions_count' => $sub->user_subscriptions_count,
        ];
    }
}
