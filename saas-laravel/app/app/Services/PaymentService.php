<?php

namespace App\Services;

use App\DTO\PaymentsDTO;
use App\Repositories\PaymentRepository;
use Illuminate\Pagination\LengthAwarePaginator;

class PaymentService
{
    public function __construct(
        protected PaymentRepository $payments
    ) {}

    public function getMerchantPayments(
        int $merchantId,
        int $perPage = 15
    ): LengthAwarePaginator {
        $paginator = $this->payments->paginateByMerchant(
            merchantId: $merchantId,
            perPage: $perPage
        );

        $paginator = $paginator->through(
            fn ($payment) => PaymentsDTO::fromModel($payment)->toArray()
        );

        return $paginator;
    }
}
