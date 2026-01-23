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
            ->excludeEventType(5) // MESSAGE_BROKER_MESSAGES
            ->forPayment($filters['payment_id'] ?? null)
            ->whereStatus($filters['status'] ?? null)
            ->whereEventType($filters['event_type'] ?? null)
            ->paginate($perPage);
    }

    public function show(int $id)
    {
        return (new PaymentLogsBuilder())
        ->whereId($id ?? null)
        ->excludeEventType(5) // MESSAGE_BROKER_MESSAGES
        ->first();
    }

    public function byPayment (int $paymentId, $filters = [], $perPage = 15) {
        return (new PaymentLogsBuilder())
        ->excludeEventType(5) // MESSAGE_BROKER_MESSAGES
        ->forPayment($paymentId)
        ->paginate($perPage);
    }
}
