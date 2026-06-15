<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Jobs\MerchantPaymentsExportJob;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexMerchantPaymentsRequest;
use App\Http\Requests\Admin\IndexPaymentsRequest;
use App\Http\Requests\Admin\StoreMerchantPaymentsExportRequest;
use App\Models\AdminExportFile;
use App\Services\PaymentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class PaymentController extends Controller
{
    public function __construct(
        private readonly PaymentService $payments,
    ) {}

    public function index(IndexPaymentsRequest $request): Response
    {
        $filters = $request->validated();

        return Inertia::render('Admin/Payments/Index', [
            'filters' => $filters,
            'payments' => $this->payments->paginate($filters),
        ]);
    }

    public function merchants(IndexMerchantPaymentsRequest $request): Response
    {
        $filters = $request->validated();

        return Inertia::render('Admin/Payments/Merchants', [
            'filters' => $filters,
            'activity' => $this->payments->merchantActivity($filters),
            'exports' => $this->payments->recentMerchantPaymentExports((string) Auth::id()),
        ]);
    }

    public function exportMerchants(StoreMerchantPaymentsExportRequest $request): RedirectResponse
    {
        $payload = $request->validated();
        $format = $payload['format'];
        unset($payload['format']);

        $export = AdminExportFile::query()->create([
            'admin_user_id' => Auth::id(),
            'type' => 'merchant_payments',
            'format' => $format,
            'status' => 'queued',
            'filters' => $payload,
            'message' => 'Export queued. Horizon will process it shortly.',
        ]);

        MerchantPaymentsExportJob::dispatch($export->id);

        return back()->with('success', strtoupper($format).' merchant payments export queued.');
    }

    public function downloadMerchantExport(AdminExportFile $export): StreamedResponse
    {
        abort_unless($export->admin_user_id === Auth::id(), 403);
        abort_unless($export->type === 'merchant_payments' && $export->status === 'completed', 404);
        abort_unless($export->path && Storage::exists($export->path), 404);

        return Storage::download(
            $export->path,
            $export->filename ?? 'merchant-payments-export.'.$export->format,
            ['Content-Type' => $export->mime ?? 'application/octet-stream'],
        );
    }
}
