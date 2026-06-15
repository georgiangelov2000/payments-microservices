<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class ExpireStaleCheckoutsCommand extends Command
{
    protected $signature = 'payments:expire-stale-checkouts
                            {--ttl=24 : Checkout TTL in hours}
                            {--dry-run : Print affected IDs without updating}';

    protected $description = 'Mark pending payments whose checkout window has expired as EXPIRED (status 9).';

    public function handle(): int
    {
        $ttlHours  = (int) $this->option('ttl');
        $cutoff    = Carbon::now()->subHours($ttlHours);
        $isDryRun  = (bool) $this->option('dry-run');

        $query = Payment::query()
            ->where('status', PaymentStatus::PENDING)
            ->where('created_at', '<', $cutoff);

        $count = $query->count();

        if ($count === 0) {
            $this->info('No stale pending checkouts found.');
            return self::SUCCESS;
        }

        if ($isDryRun) {
            $ids = $query->pluck('id')->all();
            $this->warn("[dry-run] Would expire {$count} payment(s): ".implode(', ', $ids));
            return self::SUCCESS;
        }

        $updated = $query->update(['status' => PaymentStatus::EXPIRED]);

        $this->info("Expired {$updated} stale pending checkout(s) older than {$ttlHours}h (cutoff: {$cutoff}).");

        return self::SUCCESS;
    }
}
