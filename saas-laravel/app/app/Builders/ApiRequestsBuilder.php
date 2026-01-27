<?php

namespace App\Builders;

use App\Models\ApiRequest;
use Illuminate\Database\Eloquent\Builder;

class ApiRequestsBuilder
{
    protected Builder $query;

    public function __construct()
    {
        $this->query = ApiRequest::query()
            ->with([
                'subscription:id,name',
                'payment:id,order_id,status',
            ]);
    }

    public function forMerchant(?int $merchantId): self
    {
        if ($merchantId) {
            $this->query->where('user_id', $merchantId);
        }

        return $this;
    }

    public function whereSubscription(?int $subscriptionId): self
    {
        if ($subscriptionId) {
            $this->query->where('subscription_id', $subscriptionId);
        }

        return $this;
    }

    public function wherePayment(?int $paymentId): self
    {
        if ($paymentId) {
            $this->query->where('payment_id', $paymentId);
        }

        return $this;
    }

    public function whereSource(?string $source): self
    {
        if ($source) {
            $this->query->whereHas(
                'subscription',
                fn (Builder $q) => $q->where('name', $source)
            );
        }

        return $this;
    }

    public function whereDateRange(?string $from, ?string $to): self
    {
        if ($from) {
            $this->query->whereDate('created_at', '>=', $from);
        }

        if ($to) {
            $this->query->whereDate('created_at', '<=', $to);
        }

        return $this;
    }

    public function getQuery(): Builder
    {
        return $this->query;
    }
}
