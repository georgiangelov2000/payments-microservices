<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Payments\PaymentRepositoryInterface;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use Illuminate\Pagination\LengthAwarePaginator;

final class PaymentRepository implements PaymentRepositoryInterface
{
    public function paginate(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        return Payment::query()
            ->select([
                'id', 'order_id', 'price', 'status', 'provider_status',
                'currency', 'country', 'locale', 'channel',
                'merchant_id', 'provider_id', 'created_at',
            ])
            ->with([
                'merchant:id,name,email',
                'provider:id,name,alias',
                'logs' => fn ($q) => $q->oldest('created_at'),
                'routingAttempts' => fn ($q) => $q->orderBy('attempt_number'),
            ])
            ->when($filters['search'] ?? null, function ($query, string $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereRaw('CAST(order_id AS TEXT) ILIKE ?', ["%{$search}%"])
                        ->orWhereHas('merchant', fn ($q) => $q
                            ->where('name', 'ilike', "%{$search}%")
                            ->orWhere('email', 'ilike', "%{$search}%")
                        );
                });
            })
            ->when(
                $filters['status'] ?? null,
                fn ($q, string $status) => $q->where('status', PaymentStatus::fromString($status)->value)
            )
            ->when(
                $filters['date_from'] ?? null,
                fn ($q, string $date) => $q->whereDate('created_at', '>=', $date)
            )
            ->when(
                $filters['date_to'] ?? null,
                fn ($q, string $date) => $q->whereDate('created_at', '<=', $date)
            )
            ->latest()
            ->paginate($perPage)
            ->withQueryString();
    }
}
