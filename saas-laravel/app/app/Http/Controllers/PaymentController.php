<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\PaymentStatus;
use App\Exports\PaymentsExport;
use App\Http\Requests\ExportRequest;
use App\Http\Requests\PaymentRequest;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class PaymentController extends Controller
{
    public function __construct(
        private readonly PaymentService $paymentService
    ) {}

    public function index(PaymentRequest $request): Response
    {
        $params = $request->safe()->toArray();

        return Inertia::render('Payments/Index', [
            'payments' => $this->paymentService->fetchAll($params),
        ]);
    }

    public function export(ExportRequest $request): JsonResponse|BinaryFileResponse|StreamedResponse
    {
        $params = $request->safe()->toArray();
        $format = $params['format'];
        $params['status'] = $params['status']
            ? PaymentStatus::fromString($params['status'])->value
            : null;

        $filename = sprintf('payments_%s.%s', now()->format('Ymd_His'), $format);

        if ($format === 'json') {
            $rows = (new PaymentsExport($params['merchant_id'], $params))
                ->query()
                ->get()
                ->map(fn ($payment) => [
                    'id' => $payment->id,
                    'order_id' => $payment->order_id,
                    'amount' => (float) $payment->price,
                    'status' => $payment->status->label(),
                    'provider' => $payment->provider?->name,
                    'created_at' => $payment->created_at->toDateTimeString(),
                ]);

            return response()->streamDownload(
                fn () => print json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
                $filename,
                ['Content-Type' => 'application/json']
            );
        }

        $writerType = $format === 'csv' ? ExcelFormat::CSV : ExcelFormat::XLSX;

        return Excel::download(
            new PaymentsExport($params['merchant_id'], $params),
            $filename,
            $writerType
        );
    }
}
