<?php

namespace App\Repositories;

use App\Builders\PaymentsBuilder;
use Illuminate\Pagination\LengthAwarePaginator;
use App\Enums\PaymentStatus;

class PaymentRepository
{
    public function paginateByMerchant(
        int $merchantId,
        int $perPage = 15,
        array $filters = []
    ): LengthAwarePaginator {

        if (!empty($filters['status'])) {
            $filters['status'] = PaymentStatus::fromString($filters['status'])->value;
        }
        return (new PaymentsBuilder())
            ->forMerchant($merchantId)
            ->whereId($filters['order_id'] ?? null)
            ->status($filters['status'] ?? null)
            ->dateRange(
                $filters['from'] ?? null,
                $filters['to'] ?? null
            )
            ->latest()
            ->paginate($perPage);
    }
}
