<?php
declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\PaymentRequest;
use App\Jobs\PaymentsExportJob;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function __construct(
        private readonly PaymentService $paymentService
    ) {}

    public function index(PaymentRequest $request): Response
    {
        $params = $request->safe()->toArray();
        return Inertia::render('Payments/Index', [
            'payments' => $this->paymentService->fetchAll($params)
        ]);
    }

    public function export(PaymentRequest $request): JsonResponse
    {
        PaymentsExportJob::dispatch(
            filters: $request->only(['from', 'to', 'status']),
            userId: auth()->id()
        );

        return response()->json([
            'message' => 'Export request received. You will get the file by email.',
        ], 202);
    }
}
