<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\PaymentStatus;
use App\Http\Requests\ExportRequest;
use App\Http\Requests\PaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Jobs\PaymentsExportJob;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

final class PaymentController extends Controller
{
    public function __construct(
        private readonly PaymentService $paymentService
    ) {}

    public function show(string $id): Response
    {
        $merchantId = Auth::id();

        $payment = Payment::query()
            ->with(['provider:id,name,alias', 'logs', 'routingAttempts' => fn ($q) => $q->orderBy('attempt_number')])
            ->where('merchant_id', $merchantId)
            ->findOrFail($id);

        return Inertia::render('Payments/Show', [
            'payment' => [
                'id'                   => $payment->id,
                'order_id'             => $payment->order_id,
                'price'                => (float) $payment->price,
                'currency'             => $payment->currency ?? 'USD',
                'country'              => $payment->country,
                'channel'              => $payment->channel,
                'locale'               => $payment->locale,
                'status'               => $payment->status instanceof PaymentStatus
                    ? $payment->status->label()
                    : (string) $payment->status,
                'environment'          => $payment->environment,
                'routing_strategy'     => $payment->routing_strategy,
                'routing_metadata'     => $payment->routing_metadata,
                'provider'             => $payment->provider?->alias,
                'provider_name'        => $payment->provider?->name,
                'provider_reference'   => $payment->provider_reference,
                'provider_checkout_url'=> $payment->provider_checkout_url,
                'idempotency_key'      => $payment->idempotency_key,
                'created_at'           => $payment->created_at?->toDateTimeString(),
                'updated_at'           => $payment->updated_at?->toDateTimeString(),
            ],
            'timeline' => $payment->logs
                ->sortBy('created_at')
                ->values()
                ->map(fn ($log) => [
                    'event_type' => $log->event_type instanceof \App\Enums\PaymentLogEventType
                        ? $log->event_type->label()
                        : (string) $log->event_type,
                    'status'    => $log->status instanceof \App\Enums\PaymentLogStatus
                        ? $log->status->label()
                        : (string) $log->status,
                    'message'   => $log->message,
                    'payload'   => $log->payload,
                    'timestamp' => $log->created_at?->toDateTimeString(),
                ]),
            'routing_attempts' => $payment->routingAttempts
                ->map(fn ($a) => [
                    'attempt_number' => $a->attempt_number,
                    'provider_alias' => $a->provider_alias,
                    'strategy'       => $a->strategy,
                    'status'         => $a->status,
                    'latency_ms'     => $a->latency_ms,
                    'error_code'     => $a->error_code,
                    'error_message'  => $a->error_message,
                    'timestamp'      => $a->created_at?->toDateTimeString(),
                ]),
        ]);
    }

    public function index(PaymentRequest $request): Response
    {
        $params = $request->safe()->toArray();

        return Inertia::render('Payments/Index', [
            'payments' => $this->resolveResourcePaginator($this->paymentService->fetchAll($params), PaymentResource::class),
        ]);
    }

    public function export(ExportRequest $request): JsonResponse
    {
        $params = $request->safe()->toArray();
        $params['status'] = $params['status']
            ? PaymentStatus::fromString($params['status'])->value
            : null;

        $user = Auth::user();

        PaymentsExportJob::dispatch(
            merchantId: $params['merchant_id'],
            userEmail: $user->email,
            format: $params['format'],
            filters: $params,
        );

        return response()->json([
            'message' => __('messages.exports.queued', ['email' => $user->email]),
        ], 202);
    }
}
