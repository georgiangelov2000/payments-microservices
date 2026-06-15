<?php

declare(strict_types=1);

namespace App\Contracts\Payments;

use Illuminate\Pagination\LengthAwarePaginator;

interface PaymentRepositoryInterface
{
    public function paginate(array $filters, int $perPage = 15): LengthAwarePaginator;

    public function merchantActivity(array $filters, int $perPage = 15): array;

    public function merchantActivityExport(array $filters): array;
}
