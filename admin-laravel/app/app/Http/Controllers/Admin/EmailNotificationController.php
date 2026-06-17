<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateEmailNotificationSettingsRequest;
use App\Http\Requests\Admin\UpdateEmailNotificationTemplateRequest;
use App\Services\AdminEmailNotificationService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class EmailNotificationController extends Controller
{
    public function __construct(private readonly AdminEmailNotificationService $notifications) {}

    public function index(): Response
    {
        $deliveries = $this->notifications->deliveries();

        return Inertia::render('Admin/Notifications/Index', [
            'settings' => $this->notifications->settings(),
            'events' => AdminEmailNotificationService::EVENTS,
            'templates' => $this->notifications->templates()->map(fn ($template) => [
                'id' => $template->id,
                'event_type' => $template->event_type,
                'subject' => $template->subject,
                'body' => $template->body,
                'enabled' => $template->enabled,
            ]),
            'deliveries' => $deliveries->through(fn ($delivery) => [
                'id' => $delivery->id,
                'merchant' => $delivery->merchant ? [
                    'id' => $delivery->merchant->id,
                    'name' => $delivery->merchant->name,
                    'email' => $delivery->merchant->email,
                ] : null,
                'event_type' => $delivery->event_type,
                'payment_id' => $delivery->payment_id,
                'order_id' => $delivery->order_id,
                'recipient_email' => $delivery->recipient_email,
                'status' => $delivery->status,
                'attempts' => $delivery->attempts,
                'failure_reason' => $delivery->failure_reason,
                'sent_at' => $delivery->sent_at?->toIso8601String(),
                'created_at' => $delivery->created_at?->toIso8601String(),
            ]),
        ]);
    }

    public function updateSettings(UpdateEmailNotificationSettingsRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $this->notifications->updateSettings([
            'enabled' => (bool) $validated['enabled'],
            'max_recipients' => (int) $validated['max_recipients'],
            'retry_attempts' => (int) $validated['retry_attempts'],
            'default_events' => array_fill_keys($validated['default_events'] ?? [], true),
        ]);

        return back()->with('success', 'Email notification defaults updated.');
    }

    public function updateTemplate(string $eventType, UpdateEmailNotificationTemplateRequest $request): RedirectResponse
    {
        abort_unless(array_key_exists($eventType, AdminEmailNotificationService::EVENTS), 404);

        $this->notifications->updateTemplate($eventType, $request->validated());

        return back()->with('success', 'Email notification template updated.');
    }
}
