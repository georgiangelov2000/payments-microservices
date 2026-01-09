<?php

namespace App\Services;

use App\Repositories\PaymentRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PaymentService
{
    public function __construct(
        protected PaymentRepository $payments
    ) {}

    public function getMerchantPayments(
        int $merchantId,
        int $perPage = 15
    ): LengthAwarePaginator {
        return $this->payments->paginateByMerchant(
            merchantId: $merchantId,
            perPage: $perPage
        );
    }
}
