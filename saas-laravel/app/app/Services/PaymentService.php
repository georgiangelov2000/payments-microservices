<?php
declare(strict_types=1);

namespace App\Services;

use App\Contracts\Payments\PaymentRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;
use App\DTO\PaymentsDTO;
use App\Models\PaymentLog;

final class PaymentService
{
    public function __construct(
        private readonly PaymentRepositoryInterface $paymentRepository
    ) {}

    public function fetchAll(array $params = []): LengthAwarePaginator {
        $payments = $this->paymentRepository->fetchAll($params)
            ->latest('id')
            ->paginate($params["per_page"]);

        $paymentIds = $payments->getCollection()->pluck('id');

        $logsByPayment = PaymentLog::query()
            ->whereIn('payment_id', $paymentIds)
            ->orderBy('created_at')
            ->get()
            ->groupBy('payment_id');

        $payments->setCollection(
            $payments->getCollection()->map(
                fn ($payment) => PaymentsDTO::fromModel(
                    $payment,
                    $logsByPayment->get($payment->id, collect())
                )->toArray()
            )
        );
        
        return $payments;
    }

}
