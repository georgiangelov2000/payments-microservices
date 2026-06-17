<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PaymentStatus;
use App\Jobs\SendEmailNotificationJob;
use App\Models\EmailNotificationDelivery;
use App\Models\EmailNotificationEventPreference;
use App\Models\EmailNotificationGlobalSetting;
use App\Models\EmailNotificationRecipient;
use App\Models\EmailNotificationSetting;
use App\Models\EmailNotificationTemplate;
use App\Models\Payment;
use App\Models\PaymentRoutingAttempt;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EmailNotificationService
{
    public const EVENTS = [
        'payment.succeeded' => 'Payment succeeded',
        'payment.failed' => 'Payment failed',
        'payment.pending_too_long' => 'Payment pending too long',
        'payment.refunded' => 'Payment refunded',
        'payment.partially_refunded' => 'Payment partially refunded',
        'payment.disputed' => 'Payment disputed',
        'payment.cancelled' => 'Payment cancelled',
        'payment.expired' => 'Payment expired',
        'provider.timeout' => 'Provider timeout',
        'routing.failed_over' => 'Routing failed over',
        'routing.all_providers_failed' => 'All providers failed',
    ];

    public const SENDABLE_EVENTS = [
        'payment.succeeded',
        'payment.failed',
        'payment.pending_too_long',
        'provider.timeout',
        'routing.all_providers_failed',
    ];

    public function defaults(): array
    {
        return [
            'enabled' => true,
            'max_recipients' => 5,
            'retry_attempts' => 3,
            'default_events' => array_fill_keys(self::SENDABLE_EVENTS, true),
        ];
    }

    public function ensureMerchantDefaults(string $merchantId, ?string $email = null): void
    {
        EmailNotificationSetting::firstOrCreate(
            ['merchant_id' => $merchantId],
            [
                'enabled' => true,
                'environment_scope' => 'both',
                'pending_threshold_minutes' => 60,
                'minimum_amount' => null,
            ],
        );

        if ($email && ! EmailNotificationRecipient::query()->where('merchant_id', $merchantId)->exists()) {
            EmailNotificationRecipient::firstOrCreate([
                'merchant_id' => $merchantId,
                'email' => strtolower($email),
            ]);
        }

        $defaultEvents = $this->globalSettings()['default_events'] ?? [];
        foreach (self::EVENTS as $event => $label) {
            EmailNotificationEventPreference::firstOrCreate(
                ['merchant_id' => $merchantId, 'event_type' => $event],
                ['enabled' => (bool) ($defaultEvents[$event] ?? false)],
            );
        }

        $this->ensureTemplates();
    }

    public function settingsForMerchant(string $merchantId, ?string $email = null): array
    {
        $this->ensureMerchantDefaults($merchantId, $email);

        return [
            'setting' => EmailNotificationSetting::query()->findOrFail($merchantId),
            'recipients' => EmailNotificationRecipient::query()
                ->where('merchant_id', $merchantId)
                ->orderBy('email')
                ->get(),
            'preferences' => EmailNotificationEventPreference::query()
                ->where('merchant_id', $merchantId)
                ->orderBy('event_type')
                ->get(),
            'events' => self::EVENTS,
            'global' => $this->globalSettings(),
        ];
    }

    public function updateMerchantSettings(string $merchantId, array $data): void
    {
        $maxRecipients = (int) ($this->globalSettings()['max_recipients'] ?? 5);

        DB::transaction(function () use ($merchantId, $data, $maxRecipients): void {
            EmailNotificationSetting::updateOrCreate(
                ['merchant_id' => $merchantId],
                [
                    'enabled' => (bool) $data['enabled'],
                    'environment_scope' => $data['environment_scope'],
                    'pending_threshold_minutes' => (int) $data['pending_threshold_minutes'],
                    'minimum_amount' => $data['minimum_amount'] ?? null,
                ],
            );

            EmailNotificationRecipient::query()->where('merchant_id', $merchantId)->delete();
            foreach (array_slice($data['recipients'] ?? [], 0, $maxRecipients) as $email) {
                EmailNotificationRecipient::create([
                    'merchant_id' => $merchantId,
                    'email' => strtolower($email),
                    'active' => true,
                ]);
            }

            foreach (self::EVENTS as $event => $label) {
                EmailNotificationEventPreference::updateOrCreate(
                    ['merchant_id' => $merchantId, 'event_type' => $event],
                    ['enabled' => in_array($event, $data['events'] ?? [], true)],
                );
            }
        });
    }

    public function deliveriesForMerchant(string $merchantId): LengthAwarePaginator
    {
        return EmailNotificationDelivery::query()
            ->where('merchant_id', $merchantId)
            ->orderByDesc('created_at')
            ->paginate(25);
    }

    public function queuePaymentEvent(Payment $payment, string $eventType): int
    {
        return $this->queueForPayment($payment, $eventType, $payment->id);
    }

    public function queueProviderTimeout(PaymentRoutingAttempt $attempt): int
    {
        $payment = $attempt->payment;
        if (! $payment) {
            return 0;
        }

        return $this->queueForPayment($payment, 'provider.timeout', $attempt->id);
    }

    private function queueForPayment(Payment $payment, string $eventType, string $sourceId): int
    {
        if (! in_array($eventType, self::SENDABLE_EVENTS, true) || ! $this->globalEnabled()) {
            return 0;
        }

        $this->ensureMerchantDefaults((string) $payment->merchant_id, $payment->merchant?->email);
        $setting = EmailNotificationSetting::query()->find($payment->merchant_id);
        if (! $setting?->enabled || ! $this->environmentMatches($setting->environment_scope, $payment->environment ?? 'test')) {
            return 0;
        }

        $preference = EmailNotificationEventPreference::query()
            ->where('merchant_id', $payment->merchant_id)
            ->where('event_type', $eventType)
            ->first();
        if (! $preference?->enabled) {
            return 0;
        }

        if ($setting->minimum_amount !== null && (float) $payment->price < (float) $setting->minimum_amount) {
            return 0;
        }

        $recipients = EmailNotificationRecipient::query()
            ->where('merchant_id', $payment->merchant_id)
            ->where('active', true)
            ->orderBy('email')
            ->get();

        $queued = 0;
        foreach ($recipients as $recipient) {
            $idempotencyKey = sha1(implode('|', [$eventType, $sourceId, $recipient->email]));
            $delivery = EmailNotificationDelivery::firstOrCreate(
                ['idempotency_key' => $idempotencyKey],
                [
                    'merchant_id' => $payment->merchant_id,
                    'payment_id' => $payment->id,
                    'order_id' => (string) $payment->order_id,
                    'event_type' => $eventType,
                    'recipient_email' => $recipient->email,
                    'status' => 'pending',
                ],
            );

            if ($delivery->wasRecentlyCreated) {
                SendEmailNotificationJob::dispatch($delivery->id);
                $queued++;
            }
        }

        return $queued;
    }

    public function scanRecentEvents(): int
    {
        $queued = 0;

        Payment::query()
            ->whereIn('status', [PaymentStatus::FINISHED->value, PaymentStatus::FAILED->value])
            ->where('created_at', '>=', now()->subDays(14))
            ->chunkById(100, function (Collection $payments) use (&$queued): void {
                foreach ($payments as $payment) {
                    $queued += $this->queuePaymentEvent(
                        $payment,
                        $payment->status === PaymentStatus::FINISHED ? 'payment.succeeded' : 'payment.failed',
                    );

                    if ($payment->status === PaymentStatus::FAILED && ! $payment->routingAttempts()->where('status', 'succeeded')->exists()) {
                        $queued += $this->queuePaymentEvent($payment, 'routing.all_providers_failed');
                    }
                }
            });

        Payment::query()
            ->where('status', PaymentStatus::PENDING->value)
            ->where('created_at', '>=', now()->subDays(14))
            ->chunkById(100, function (Collection $payments) use (&$queued): void {
                foreach ($payments as $payment) {
                    $setting = EmailNotificationSetting::query()->find($payment->merchant_id);
                    $threshold = (int) ($setting?->pending_threshold_minutes ?? 60);
                    if ($payment->created_at?->lte(now()->subMinutes($threshold))) {
                        $queued += $this->queuePaymentEvent($payment, 'payment.pending_too_long');
                    }
                }
            });

        PaymentRoutingAttempt::query()
            ->with('payment')
            ->where('status', 'timeout')
            ->where('created_at', '>=', now()->subDays(14))
            ->chunkById(100, function (Collection $attempts) use (&$queued): void {
                foreach ($attempts as $attempt) {
                    $queued += $this->queueProviderTimeout($attempt);
                }
            });

        return $queued;
    }

    public function globalSettings(): array
    {
        $stored = EmailNotificationGlobalSetting::query()->find('email_notifications')?->value ?? [];

        return array_replace_recursive($this->defaults(), $stored);
    }

    public function updateGlobalSettings(array $settings): void
    {
        EmailNotificationGlobalSetting::updateOrCreate(
            ['key' => 'email_notifications'],
            ['value' => array_replace_recursive($this->globalSettings(), $settings)],
        );
    }

    public function ensureTemplates(): void
    {
        foreach (self::EVENTS as $event => $label) {
            EmailNotificationTemplate::firstOrCreate(
                ['event_type' => $event],
                [
                    'subject' => "PayFlow: {$label}",
                    'body' => "Event: {{event_label}}\nOrder: {{order_id}}\nPayment ID: {{payment_id}}\nAmount: {{amount}} {{currency}}\nEnvironment: {{environment}}\nStatus: {{status}}",
                    'enabled' => true,
                ],
            );
        }
    }

    public function renderTemplate(EmailNotificationDelivery $delivery): array
    {
        $this->ensureTemplates();
        $template = EmailNotificationTemplate::query()
            ->where('event_type', $delivery->event_type)
            ->where('enabled', true)
            ->first();

        $payment = $delivery->payment;
        $values = [
            '{{event}}' => $delivery->event_type,
            '{{event_label}}' => self::EVENTS[$delivery->event_type] ?? $delivery->event_type,
            '{{payment_id}}' => (string) ($payment?->id ?? $delivery->payment_id ?? ''),
            '{{order_id}}' => (string) ($payment?->order_id ?? $delivery->order_id ?? ''),
            '{{amount}}' => $payment ? number_format((float) $payment->price, 2) : '',
            '{{currency}}' => (string) ($payment?->currency ?? 'USD'),
            '{{environment}}' => (string) ($payment?->environment ?? ''),
            '{{status}}' => $payment?->status instanceof PaymentStatus ? $payment->status->label() : (string) ($payment?->status ?? ''),
        ];

        return [
            'subject' => strtr($template?->subject ?? 'PayFlow email notification', $values),
            'body' => strtr($template?->body ?? '', $values),
        ];
    }

    public function retryAttempts(): int
    {
        return max(1, (int) ($this->globalSettings()['retry_attempts'] ?? 3));
    }

    private function globalEnabled(): bool
    {
        return (bool) ($this->globalSettings()['enabled'] ?? true);
    }

    private function environmentMatches(string $scope, string $environment): bool
    {
        return $scope === 'both' || $scope === $environment;
    }
}
