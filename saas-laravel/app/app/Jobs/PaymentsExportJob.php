<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Exports\PaymentsExport;
use App\Mail\PaymentsExportReadyMail;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class PaymentsExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [60, 300, 600];

    public function __construct(protected array $filters)
    {
        $this->onQueue('exports');
    }

    public function handle(): void
    {
        Storage::disk('public')->makeDirectory('exports');
        $userId = $this->filters['merchant_id'];

        $path = sprintf(
            'exports/payments_%s_%s.xlsx',
            $userId,
            now()->format('Ymd_His')
        );

        Excel::store(new PaymentsExport($userId, $this->filters), $path, 'public');

        $user = User::findOrFail($userId);

        Mail::to($user->email)->send(new PaymentsExportReadyMail($path));
    }
}
