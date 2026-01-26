<?php

namespace App\Http\Controllers;

use App\Jobs\PaymentsExportJob;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
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

    public function export(Request $request): JsonResponse
    {
        $filters = $request->only(['from', 'to', 'status']);

        PaymentsExportJob::dispatch(
            filters: $filters,
            userId: auth()->id()
        );

        return response()->json([
            'message' => 'Export request received. You will get the file by email.',
        ], 202);
    }

}
