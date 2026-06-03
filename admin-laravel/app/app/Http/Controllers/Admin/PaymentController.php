<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Payments/Index', [
            'payments' => Payment::query()
                ->with(['merchant:id,name,email', 'provider:id,name,alias'])
                ->latest()
                ->paginate(15)
                ->through(fn (Payment $payment) => [
                    'id' => $payment->id,
                    'order_id' => $payment->order_id,
                    'amount' => (float) $payment->amount,
                    'price' => (float) $payment->price,
                    'status' => $payment->status?->label(),
                    'provider_status' => $payment->provider_status,
                    'merchant' => $payment->merchant ? [
                        'name' => $payment->merchant->name,
                        'email' => $payment->merchant->email,
                    ] : null,
                    'provider' => $payment->provider?->alias,
                    'created_at' => $payment->created_at?->toDateTimeString(),
                ]),
        ]);
    }
}
