<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Payments\PaymentRepositoryInterface;
use Illuminate\Pagination\LengthAwarePaginator;

final class PaymentService
{
    public function __construct(
        private readonly PaymentRepositoryInterface $paymentRepository
    ) {}

    public function fetchAll(array $params = []): LengthAwarePaginator
    {
        return $this->paymentRepository->fetchAll($params)
            ->with([
                'provider:id,name,alias',
                'logs' => fn ($query) => $query->orderBy('created_at'),
            ])
            ->latest('id')
            ->paginate($params['per_page']);
    }
}
