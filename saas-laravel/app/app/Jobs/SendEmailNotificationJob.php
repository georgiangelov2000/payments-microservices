<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Mail\EmailNotificationMail;
use App\Models\EmailNotificationDelivery;
use App\Services\EmailNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendEmailNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [60, 300, 600];

    public int $timeout = 60;

    public function __construct(public readonly string $deliveryId)
    {
        $this->onQueue('notifications');
    }

    public function handle(EmailNotificationService $service): void
    {
        $delivery = EmailNotificationDelivery::query()
            ->with(['payment.merchant', 'payment.provider'])
            ->find($this->deliveryId);
        if (! $delivery || $delivery->status === 'sent') {
            return;
        }

        if ($delivery->attempts >= $service->retryAttempts()) {
            $delivery->update([
                'status' => 'failed',
                'failure_reason' => 'Retry limit reached.',
            ]);

            return;
        }

        $delivery->increment('attempts');

        try {
            $content = $service->renderTemplate($delivery);
            Mail::to($delivery->recipient_email)->send(new EmailNotificationMail(
                $content['subject'],
                $content['body'],
                $content['notification']
            ));

            $delivery->update([
                'status' => 'sent',
                'failure_reason' => null,
                'sent_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $delivery->update([
                'status' => 'failed',
                'failure_reason' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
