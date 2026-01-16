<?php
namespace App\Repositories;
use App\Models\UserSubscription;
use Illuminate\Pagination\LengthAwarePaginator;

final class SubscriptionRepository
{
    public function getByMerchantId(
        int $merchantId,
        int $perPage = 15
    ): LengthAwarePaginator {
        return UserSubscription::where('user_id', $merchantId)
            ->with('subscription')
            ->latest()
            ->paginate($perPage);
    }
}