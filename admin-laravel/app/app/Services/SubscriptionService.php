<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Subscriptions\SubscriptionRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;

final class SubscriptionService
{
    public function __construct(
        private readonly SubscriptionRepositoryInterface $repository,
    ) {}

    public function paginate(): LengthAwarePaginator
    {
        return $this->repository->paginate();
    }
}
