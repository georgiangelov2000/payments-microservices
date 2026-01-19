<?php

namespace App\Http\Controllers;

use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function __construct(
        protected PaymentService $payments
    ) {}

    public function index(Request $request): Response
    {
        $user = Auth::user();

        abort_if(!$user, 403);
        
        $merchantId = $user->id;
        $perPage = $request->integer('per_page', 15);

        $payments = $this->payments->getMerchantPayments(
            merchantId: $merchantId,
            perPage: $perPage,
            filters: $request->all()
        );

        return Inertia::render('Payments/Index', [
            'payments' => $payments,
        ]);
    }
}
