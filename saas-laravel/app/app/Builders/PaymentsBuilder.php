<?php

namespace App\Builders;

use App\Models\Payment;
use Illuminate\Database\Eloquent\Builder;

class PaymentsBuilder
{
    protected Builder $query;

    public function __construct()
    {
        $this->query = Payment::query()
            ->with(['provider:id,name']);
    }

    public function forMerchant(?string $merchantId): self
    {
        if ($merchantId === null) {
            throw new \InvalidArgumentException('Merchant ID is required.');
        }
        $this->query->where('merchant_id', $merchantId);
        return $this;
    }

    public function whereId(?string $id): self
    {
        if($id) {
            $this->query->where('id' ,$id);
        }
        return $this;
    }

    public function whereStatus(int|string|null $status): self
    {
        if ($status) {
            $this->query->where('status', $status);
        }

        return $this;
    }

    public function wheredDateRange(?string $from, ?string $to): self
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

    public function whereOrder(int|string|null $orderId) {
        if ($orderId) {
            $this->query->where('order_id', $orderId);
        }
        return $this;        
    }    

    public function latest(): self
    {
        $this->query->latest();
        return $this;
    }
}
