<?php
declare(strict_types=1);

namespace App\Services;

use App\Contracts\Payments\PaymentRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;
use App\DTO\PaymentsDTO;

class PaymentService
{
    public function __construct(
        private readonly PaymentRepositoryInterface $paymentRepository
    ) {}

    public function fetchAll(array $params = []): LengthAwarePaginator {
        $payments = $this->paymentRepository->fetchAll($params)
            ->latest('id')
            ->paginate($params["per_page"]);

        $payments = $payments->through(
            fn ($payment) => PaymentsDTO::fromModel($payment)->toArray()
        );
        
        return $payments;
    }

}
