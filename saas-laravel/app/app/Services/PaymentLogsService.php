<?php

namespace App\Services;

use App\DTO\PaymentLogsDTO;
use App\Repositories\PaymentLogsRepository;

class PaymentLogsService
{
    public function __construct(
        protected PaymentLogsRepository $repository
    ) {}

    public function get(array $filters = [])
    {
        return $this->repository->get($filters)
            ->through(fn ($log) => PaymentLogsDTO::fromModel($log)->toArray());
    }

    public function show(string $logId, string $merchantId): ?array
    {
        $log = $this->repository->show($logId, $merchantId);

        return $log ? PaymentLogsDTO::fromModel($log)->toArray() : null;
    }

    public function byPayment(string $paymentId, string $merchantId)
    {
        $paginator = $this->repository->byPayment($paymentId, $merchantId);

        if (!$paginator) {
            return null;
        }

        return $paginator->through(fn ($log) => PaymentLogsDTO::fromModel($log)->toArray());
    }
}
