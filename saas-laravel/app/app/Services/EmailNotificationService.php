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
use Illuminate\Support\Facades\Lang;

class EmailNotificationService
{
    public const EVENTS = [
        'payment.succeeded' => 'messages.events.payment_succeeded',
        'payment.failed' => 'messages.events.payment_failed',
        'payment.pending_too_long' => 'messages.events.payment_pending_too_long',
        'payment.refunded' => 'messages.events.payment_refunded',
        'payment.partially_refunded' => 'messages.events.payment_partially_refunded',
        'payment.disputed' => 'messages.events.payment_disputed',
        'payment.cancelled' => 'messages.events.payment_cancelled',
        'payment.expired' => 'messages.events.payment_expired',
        'provider.timeout' => 'messages.events.provider_timeout',
        'routing.failed_over' => 'messages.events.routing_failed_over',
        'routing.all_providers_failed' => 'messages.events.routing_all_providers_failed',
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

    public function events(): array
    {
        return array_map(static fn (string $key): string => __($key), self::EVENTS);
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
            'events' => $this->events(),
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
        foreach ($this->events() as $event => $label) {
            EmailNotificationTemplate::firstOrCreate(
                ['event_type' => $event],
                [
                    'subject' => __('messages.notifications.template_subject', ['event' => $label]),
                    'body' => __('messages.notifications.template_body'),
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
        $eventLabel = isset(self::EVENTS[$delivery->event_type])
            ? __(self::EVENTS[$delivery->event_type])
            : $delivery->event_type;
        $values = [
            '{{event}}' => $delivery->event_type,
            '{{event_label}}' => $eventLabel,
            '{{payment_id}}' => (string) ($payment?->id ?? $delivery->payment_id ?? ''),
            '{{order_id}}' => (string) ($payment?->order_id ?? $delivery->order_id ?? ''),
            '{{amount}}' => $payment ? number_format((float) $payment->price, 2) : '',
            '{{currency}}' => (string) ($payment?->currency ?? 'USD'),
            '{{environment}}' => (string) ($payment?->environment ?? ''),
            '{{status}}' => $payment?->status instanceof PaymentStatus ? $payment->status->label() : (string) ($payment?->status ?? ''),
        ];

        $renderedBody = strtr($template?->body ?? '', $values);
        $defaultBody = strtr(__('messages.notifications.template_body'), $values);
        $defaultSubject = __('messages.notifications.template_subject', ['event' => $eventLabel]);
        $subject = $template?->subject ?? __('messages.notifications.default_subject');

        if (trim($subject) === trim($defaultSubject)) {
            $subject = __('messages.notifications.email.events.'.
                str_replace('.', '_', $delivery->event_type).'.subject', [
                    'order' => $values['{{order_id}}'],
                ]);
        } else {
            $subject = strtr($subject, $values);
        }

        return [
            'subject' => $subject,
            'body' => trim($renderedBody) === trim($defaultBody) ? '' : $renderedBody,
            'notification' => $this->notificationPresentation($delivery, $eventLabel, $values),
        ];
    }

    private function notificationPresentation(
        EmailNotificationDelivery $delivery,
        string $eventLabel,
        array $values
    ): array {
        $payment = $delivery->payment;
        $eventKey = str_replace('.', '_', $delivery->event_type);
        $status = $values['{{status}}'] ?: 'pending';
        $tone = $this->eventTone($delivery->event_type);
        $statusKey = 'messages.notifications.email.statuses.'.$status;

        return [
            'event' => $delivery->event_type,
            'event_label' => $eventLabel,
            'headline' => __('messages.notifications.email.events.'.$eventKey.'.headline'),
            'summary' => __('messages.notifications.email.events.'.$eventKey.'.summary'),
            'eyebrow' => __('messages.notifications.email.eyebrow'),
            'tone' => $tone,
            'status' => $status,
            'status_label' => Lang::has($statusKey) ? __($statusKey) : ucfirst(str_replace('_', ' ', $status)),
            'merchant_name' => (string) ($payment?->merchant?->company_name ?: $payment?->merchant?->name ?: ''),
            'payment_id' => $values['{{payment_id}}'],
            'order_id' => $values['{{order_id}}'],
            'amount' => trim($values['{{amount}}'].' '.$values['{{currency}}']),
            'environment' => $values['{{environment}}'],
            'provider' => (string) ($payment?->provider?->name ?? ''),
            'routing_strategy' => (string) ($payment?->routing_strategy ?? ''),
            'occurred_at' => $payment?->updated_at?->format('M j, Y · H:i T') ?? now()->format('M j, Y · H:i T'),
            'payment_url' => $payment
                ? route('payments.show', $payment->id)
                : route('payments.index'),
            'notifications_url' => route('notifications.index'),
            'dashboard_url' => route('dashboard'),
        ];
    }

    private function eventTone(string $eventType): array
    {
        if ($eventType === 'payment.succeeded') {
            return [
                'accent' => '#16a34a',
                'soft' => '#f0fdf4',
                'border' => '#bbf7d0',
                'icon' => '✓',
            ];
        }

        if (in_array($eventType, ['payment.failed', 'routing.all_providers_failed'], true)) {
            return [
                'accent' => '#dc2626',
                'soft' => '#fef2f2',
                'border' => '#fecaca',
                'icon' => '!',
            ];
        }

        return [
            'accent' => '#d97706',
            'soft' => '#fffbeb',
            'border' => '#fde68a',
            'icon' => '!',
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
