<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\PaymentLogsRepository;

class PaymentLogsService
{
    public function __construct(
        protected PaymentLogsRepository $repository
    ) {}

    public function get(array $filters = [])
    {
        return $this->repository->get($filters);
    }

    public function show(string $logId, string $merchantId)
    {
        return $this->repository->show($logId, $merchantId);
    }

    public function byPayment(string $paymentId, string $merchantId)
    {
        $paginator = $this->repository->byPayment($paymentId, $merchantId);

        if (! $paginator) {
            return null;
        }

        return $paginator;
    }
}
