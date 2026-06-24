<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\EmailNotificationDelivery;
use App\Models\EmailNotificationGlobalSetting;
use App\Models\EmailNotificationTemplate;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AdminEmailNotificationService
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

    public function settings(): array
    {
        $stored = EmailNotificationGlobalSetting::query()->find('email_notifications')?->value ?? [];

        return array_replace_recursive($this->defaults(), $stored);
    }

    public function updateSettings(array $settings): void
    {
        EmailNotificationGlobalSetting::updateOrCreate(
            ['key' => 'email_notifications'],
            ['value' => array_replace_recursive($this->settings(), $settings)],
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

    public function templates()
    {
        $this->ensureTemplates();

        return EmailNotificationTemplate::query()->orderBy('event_type')->get();
    }

    public function updateTemplate(string $eventType, array $data): void
    {
        EmailNotificationTemplate::updateOrCreate(
            ['event_type' => $eventType],
            [
                'subject' => $data['subject'],
                'body' => $data['body'],
                'enabled' => (bool) $data['enabled'],
            ],
        );
    }

    public function deliveries(): LengthAwarePaginator
    {
        return EmailNotificationDelivery::query()
            ->with(['merchant:id,name,email'])
            ->orderByDesc('created_at')
            ->paginate(50);
    }
}
