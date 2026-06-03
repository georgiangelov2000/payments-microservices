<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Builders\PaymentsBuilder;
use App\Contracts\Payments\PaymentRepositoryInterface;
use Illuminate\Database\Eloquent\Builder;

final readonly class PaymentRepository implements PaymentRepositoryInterface
{
    public function fetchAll(array $params = []): Builder
    {
        $status = $params['status'] ?? null;
        $merchantId = $params['merchant_id'] ?? null;
        $orderId = $params['order_id'] ?? null;
        $from = $params['from'] ?? null;
        $to = $params['to'] ?? null;

        return (new PaymentsBuilder)
            ->forMerchant($merchantId)
            ->whereOrder($orderId)
            ->whereStatus($status)
            ->whereDateRange($from, $to)
            ->getQuery();
    }
}
