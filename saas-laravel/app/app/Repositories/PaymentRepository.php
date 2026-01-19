<?php

namespace App\Repositories;

use App\Builders\PaymentsBuilder;
use Illuminate\Pagination\LengthAwarePaginator;

class PaymentRepository
{
    public function paginateByMerchant(
        int $merchantId,
        int $perPage = 15,
        array $filters = []
    ): LengthAwarePaginator {
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
