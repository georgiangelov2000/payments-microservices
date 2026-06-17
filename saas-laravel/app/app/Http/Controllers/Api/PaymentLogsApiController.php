<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentLogResource;
use App\Services\PaymentLogsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentLogsApiController extends Controller
{
    public function __construct(
        protected PaymentLogsService $service
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->resolveResourcePaginator($this->service->get($request->all()), PaymentLogResource::class)
        );
    }

    public function show(string $logId, Request $request): JsonResponse
    {
        $result = $this->service->show($logId, (string) auth()->id());

        if (! $result) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        return response()->json($this->resolveResource($result, PaymentLogResource::class));
    }

    public function byPayment(string $paymentId, Request $request): JsonResponse
    {
        $result = $this->service->byPayment($paymentId, (string) auth()->id());

        if (! $result) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        return response()->json([
            'results' => $this->resolveResourceCollection($result->getCollection(), PaymentLogResource::class),
            'pagination' => [
                'total' => $result->total(),
                'per_page' => $result->perPage(),
                'current_page' => $result->currentPage(),
                'last_page' => $result->lastPage(),
            ],
        ]);
    }
}
