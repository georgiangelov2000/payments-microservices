<?php

namespace App\Builders;

use App\Models\UserSubscription;
use Illuminate\Database\Eloquent\Builder;

class UserSubscriptionsBuilder
{
    protected Builder $query;

    public function __construct() {
        $this->query = UserSubscription::query()
            ->with('subscription');
    }    

    public function forMerchant(?string $merchantId): self
    {
        if ($merchantId === null) {
            throw new \InvalidArgumentException('Merchant ID is required.');
        }
        $this->query->where('user_id', $merchantId);
        return $this;
    }
    
    public function whereStatus(?string $status): self
    {
        if ($status) {
            $this->query->where('status', $status);
        }

        return $this;
    }

    public function wherePlan(?string $plan): self
    {
        if ($plan) {
            $this->query->whereHas('subscription', function (Builder $q) use ($plan) {
                $q->where('name', 'like', "%{$plan}%");
            });
        }

        return $this;
    }

    public function getQuery(): Builder
    {
        return $this->query;
    }    
}
