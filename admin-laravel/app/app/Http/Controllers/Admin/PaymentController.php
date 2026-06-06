<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:pending,finished,failed'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
        ]);

        return Inertia::render('Admin/Payments/Index', [
            'filters' => $filters,
            'payments' => Payment::query()
                ->with([
                    'merchant:id,name,email',
                    'provider:id,name,alias',
                    'logs' => fn ($query) => $query->oldest('created_at'),
                    'routingAttempts' => fn ($query) => $query->orderBy('attempt_number'),
                ])
                ->when($filters['search'] ?? null, function ($query, string $search) {
                    $query->where(function ($query) use ($search) {
                        $query->whereRaw('CAST(order_id AS TEXT) ILIKE ?', ["%{$search}%"])
                            ->orWhereHas('merchant', function ($query) use ($search) {
                                $query->where('name', 'ilike', "%{$search}%")
                                    ->orWhere('email', 'ilike', "%{$search}%");
                            });
                    });
                })
                ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', PaymentStatus::fromString($status)->value))
                ->when($filters['date_from'] ?? null, fn ($query, string $date) => $query->whereDate('created_at', '>=', $date))
                ->when($filters['date_to'] ?? null, fn ($query, string $date) => $query->whereDate('created_at', '<=', $date))
                ->latest()
                ->paginate(15)
                ->withQueryString()
                ->through(fn (Payment $payment) => [
                    'id' => $payment->id,
                    'order_id' => $payment->order_id,
                    'amount' => (float) $payment->amount,
                    'price' => (float) $payment->price,
                    'status' => $payment->status?->label(),
                    'provider_status' => $payment->provider_status,
                    'currency' => $payment->currency,
                    'country' => $payment->country,
                    'locale' => $payment->locale,
                    'channel' => $payment->channel,
                    'merchant' => $payment->merchant ? [
                        'name' => $payment->merchant->name,
                        'email' => $payment->merchant->email,
                    ] : null,
                    'provider' => $payment->provider?->alias,
                    'created_at' => $payment->created_at?->toDateTimeString(),
                    'logs' => $payment->logs->map(fn ($log) => [
                        'id' => $log->id,
                        'event_type' => $log->event_type?->label(),
                        'status' => $log->status?->label(),
                        'message' => $log->message,
                        'payload' => $log->payload,
                        'created_at' => $log->created_at?->toDateTimeString(),
                    ])->values()->all(),
                    'routing_attempts' => $payment->routingAttempts->map(fn ($attempt) => [
                        'id' => $attempt->id,
                        'provider_alias' => $attempt->provider_alias,
                        'attempt_number' => $attempt->attempt_number,
                        'status' => $attempt->status,
                        'error_code' => $attempt->error_code,
                        'error_message' => $attempt->error_message,
                        'latency_ms' => $attempt->latency_ms,
                        'created_at' => $attempt->created_at?->toDateTimeString(),
                    ])->values()->all(),
                ]),
        ]);
    }
}
