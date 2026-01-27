<?php

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
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Storage;

class PaymentsExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [60, 300, 600];

    public function __construct(protected array $filters) {
        $this->onConnection('redis');
        $this->onQueue('notifications');
    }

    public function handle(): void
    {
        Storage::disk('public')->makeDirectory('exports');
        $userId = $this->filters["merchant_id"];

        $path = sprintf(
            'exports/payments_%d_%s.xlsx',
            $userId,
            now()->format('Ymd_His')
        );

        Excel::store(new PaymentsExport($userId, $this->filters), $path, 'public');

        $user = User::findOrFail($userId);

        Mail::to($user->email)->send(new PaymentsExportReadyMail($path));
    }
}
