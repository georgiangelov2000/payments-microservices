<?php

namespace App\Repositories;

use App\Builders\PaymentLogsBuilder;
use App\Models\PaymentLog;

class PaymentLogsRepository
{
    public function get(array $filters = [], $perPage = 15)
    {

        return (new PaymentLogsBuilder())
            ->latest()
            ->forPayment($filters['payment_id'] ?? null)
            ->whereStatus($filters['status'] ?? null)
            ->whereEventType($filters['event_type'] ?? null)
            ->paginate($perPage);
    }

    public function show(int $id)
    {
        return (new PaymentLogsBuilder())
        ->whereId($id ?? null)
        ->first();
    }

    public function byPayment (int $paymentId, $filters = [], $perPage = 15) {
        return (new PaymentLogsBuilder())
        ->forPayment($paymentId)
        ->paginate($perPage);
    }
}
