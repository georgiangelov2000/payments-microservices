<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\EmailNotificationService;
use Illuminate\Console\Command;

class ScanEmailNotificationsCommand extends Command
{
    protected $signature = 'email-notifications:scan';

    protected $description = 'Scan payment and routing records and queue email notifications.';

    public function handle(EmailNotificationService $service): int
    {
        $queued = $service->scanRecentEvents();
        $this->info("Queued {$queued} email notification delivery job(s).");

        return self::SUCCESS;
    }
}
