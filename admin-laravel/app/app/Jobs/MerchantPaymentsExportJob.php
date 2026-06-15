<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Exports\MerchantPaymentsExport;
use App\Mail\MerchantPaymentsExportFailedMail;
use App\Mail\MerchantPaymentsExportReadyMail;
use App\Models\AdminExportFile;
use App\Services\PaymentService;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Maatwebsite\Excel\Facades\Excel;
use Throwable;

class MerchantPaymentsExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [60, 300, 600];

    public int $timeout = 300;

    public function __construct(
        public readonly string $exportId,
    ) {
        $this->onQueue('exports');
    }

    public function handle(PaymentService $payments): void
    {
        $export = AdminExportFile::query()->with('admin')->findOrFail($this->exportId);
        $export->update([
            'status' => 'running',
            'message' => 'Generating export file...',
        ]);

        $format = strtolower($export->format);
        $filename = sprintf(
            'merchant_payments_%s_%s.%s',
            Str::of($export->id)->substr(0, 8),
            now()->format('Ymd_His'),
            $format
        );
        $path = 'admin-exports/merchant-payments/'.$export->id.'/'.$filename;
        $rows = $payments->merchantActivityExportRows($export->filters ?? []);

        $this->generate($format, $path, $rows);

        $export->refresh();
        $export->update([
            'status' => 'completed',
            'filename' => $filename,
            'disk' => 'local',
            'path' => $path,
            'mime' => $this->mime($format),
            'size' => Storage::size($path),
            'message' => 'Export completed successfully.',
            'completed_at' => now(),
            'failed_at' => null,
        ]);

        Mail::to($export->admin->email)->send(new MerchantPaymentsExportReadyMail($export->fresh()));
    }

    public function failed(Throwable $exception): void
    {
        $export = AdminExportFile::query()->with('admin')->find($this->exportId);

        if (! $export) {
            return;
        }

        $export->update([
            'status' => 'failed',
            'message' => Str::limit($exception->getMessage(), 1000),
            'failed_at' => now(),
        ]);

        if ($export->admin?->email) {
            Mail::to($export->admin->email)->send(new MerchantPaymentsExportFailedMail($export->fresh()));
        }
    }

    private function generate(string $format, string $path, array $rows): void
    {
        if ($format === 'json') {
            Storage::put($path, json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            return;
        }

        if ($format === 'pdf') {
            $html = view('exports.merchant-payments-pdf', [
                'rows' => $rows,
                'generatedAt' => now()->format('Y-m-d H:i:s'),
            ])->render();

            $options = new Options();
            $options->set('defaultFont', 'DejaVu Sans');

            $dompdf = new Dompdf($options);
            $dompdf->loadHtml($html);
            $dompdf->setPaper('a4', 'landscape');
            $dompdf->render();

            Storage::put($path, $dompdf->output());
            return;
        }

        $writerType = $format === 'csv' ? ExcelFormat::CSV : ExcelFormat::XLSX;

        Excel::store(new MerchantPaymentsExport($rows), $path, 'local', $writerType);
    }

    private function mime(string $format): string
    {
        return match ($format) {
            'csv' => 'text/csv',
            'json' => 'application/json',
            'pdf' => 'application/pdf',
            default => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
    }
}
