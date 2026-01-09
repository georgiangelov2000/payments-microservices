<?php

namespace App\Repositories;

use App\Models\Payment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PaymentRepository
{
    public function paginateByMerchant(
        int $merchantId,
        int $perPage = 15
    ): LengthAwarePaginator {
        return Payment::where('merchant_id', $merchantId)
            ->latest()
            ->paginate($perPage);
    }
}
