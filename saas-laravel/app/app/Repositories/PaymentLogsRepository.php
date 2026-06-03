<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Builders\PaymentLogsBuilder;
use App\Models\Payment;
use App\Models\PaymentLog;

class PaymentLogsRepository
{
    public function get(array $filters = [], int $perPage = 15)
    {
        return (new PaymentLogsBuilder)
            ->latest()
            ->forPayment($filters['payment_id'] ?? null)
            ->whereStatus($filters['status'] ?? null)
            ->whereEventType($filters['event_type'] ?? null)
            ->paginate($perPage);
    }

    public function show(string $id, string $merchantId): ?PaymentLog
    {
        $log = (new PaymentLogsBuilder)->whereId($id)->first();

        if (! $log) {
            return null;
        }

        // Verify ownership via the payments DB (cross-connection — cannot use whereHas)
        $owned = Payment::query()
            ->where('id', $log->payment_id)
            ->where('merchant_id', $merchantId)
            ->exists();

        return $owned ? $log : null;
    }

    public function byPayment(string $paymentId, string $merchantId, int $perPage = 15)
    {
        // Verify the payment belongs to this merchant before querying the logs DB
        $owned = Payment::query()
            ->where('id', $paymentId)
            ->where('merchant_id', $merchantId)
            ->exists();

        if (! $owned) {
            return null;
        }

        return PaymentLog::query()
            ->where('payment_id', $paymentId)
            ->orderBy('created_at')
            ->paginate($perPage);
    }
}
