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
        $paginator = $this->repository->get($filters);

        $paginator = $paginator->through(
            fn ($log) => PaymentLogsDTO::fromModel($log)->toArray()
        );

        return $paginator;        
    }

    public function show(int $logId, array $filters = [])
    {
        return $this->repository->show($logId);
    }

    public function byPament (int $paymentId, array $filters = []) {
        $paginator = $this->repository->byPayment($paymentId, $filters);

        $paginator = $paginator->through(
            fn ($log) => PaymentLogsDTO::fromModel($log)->toArray()
        );

        return $paginator;
    }
}
