<?php

namespace App\Builders;

use App\Models\PaymentLog;
use Illuminate\Database\Eloquent\Builder;

class PaymentLogsBuilder
{
    protected Builder $query;

    public function __construct()
    {
        $this->query = PaymentLog::query();
    }

    public function whereId(?int $id) 
    {
        if ($id !== null) {
            $this->query->where("id", $id); 
        }

        return $this;
    }

    public function forPayment(?int $paymentId): self
    {
        if ($paymentId !== null) {
            $this->query->where('payment_id', $paymentId);
        }

        return $this;
    }

    public function whereStatus(?int $status): self
    {
        if ($status !== null) {
            $this->query->where('status', $status);
        }

        return $this;
    }

    public function whereEventType(?int $eventType): self
    {
        if ($eventType !== null) {
            $this->query->where('event_type', $eventType);
        }

        return $this;
    }

    public function latest(): self
    {
        $this->query->latest();
        return $this;
    }

    public function paginate(int $perPage = 15)
    {
        return $this->query->paginate($perPage);
    }

    public function first()
    {
        return $this->query->first();
    }

    public function firstOrFail()
    {
        return $this->query->firstOrFail();
    }

    public function find(int $id)
    {
        return $this->query->find($id);
    }

}
