<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\PaymentLogsService;

class PaymentLogsApiController extends Controller
{
    public function __construct(
        protected PaymentLogsService $service
    ) {}

    /**
     * GET /api/v1/logs
     */
    public function index(Request $request): JsonResponse
    {
        $result = $this->service->get($request->all());
        
        return response()->json($result, 200);
    }

    /**
     * GET /api/v1/logs/{log}
     */
    public function show(int $logId, Request $request): JsonResponse
    {
        $result = $this->service->show($logId, $request->all());
        return response()->json($result, 200);
    }

    public function byPayment(int $paymentId, Request $request): JsonResponse
    {
        $result = $this->service->byPament($paymentId, $request->all());

        return response()->json([
            'results' => $result->items(),
            'pagination' => [
                'total' => $result->total(),
                'per_page' => $result->perPage(),
                'current_page' => $result->currentPage(),
                'last_page' => $result->lastPage(),
            ],
        ], 200);
    }


}
