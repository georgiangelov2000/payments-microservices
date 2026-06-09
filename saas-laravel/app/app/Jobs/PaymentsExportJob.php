<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Exports\PaymentsExport;
use App\Mail\PaymentsExportReadyMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Maatwebsite\Excel\Facades\Excel;

class PaymentsExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [60, 300, 600];

    public int $timeout = 300;

    public function __construct(
        protected readonly string $merchantId,
        protected readonly string $userEmail,
        protected readonly string $format,
        protected readonly array $filters,
    ) {
        $this->onQueue('exports');
    }

    public function handle(): void
    {
        $filename = sprintf(
            'payments_%s_%s.%s',
            substr($this->merchantId, 0, 8),
            now()->format('Ymd_His'),
            $this->format
        );

        $storagePath = 'exports/' . $filename;

        $this->generate($storagePath);

        $absolutePath = Storage::path($storagePath);

        Mail::to($this->userEmail)->send(
            new PaymentsExportReadyMail($filename, $this->format, $absolutePath, $this->filters)
        );

        Storage::delete($storagePath);
    }

    private function generate(string $storagePath): void
    {
        if ($this->format === 'json') {
            $rows = (new PaymentsExport($this->merchantId, $this->filters))
                ->query()
                ->with('provider:id,name')
                ->get()
                ->map(fn ($p) => [
                    'id'         => $p->id,
                    'order_id'   => $p->order_id,
                    'price'      => (float) $p->price,
                    'currency'   => $p->currency,
                    'channel'    => $p->channel,
                    'country'    => $p->country,
                    'locale'     => $p->locale,
                    'status'     => $p->status->label(),
                    'provider'   => $p->provider?->name,
                    'created_at' => $p->created_at->toDateTimeString(),
                ]);

            Storage::put($storagePath, json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            return;
        }

        $writerType = $this->format === 'csv' ? ExcelFormat::CSV : ExcelFormat::XLSX;

        Excel::store(new PaymentsExport($this->merchantId, $this->filters), $storagePath, 'local', $writerType);
    }
}
