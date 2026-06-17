<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\UpdateEmailNotificationsRequest;
use App\Services\EmailNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class EmailNotificationController extends Controller
{
    public function __construct(private readonly EmailNotificationService $notifications) {}

    public function index(): Response
    {
        $user = Auth::user();
        $data = $this->notifications->settingsForMerchant($user->id, $user->email);
        $deliveries = $this->notifications->deliveriesForMerchant($user->id);

        return Inertia::render('Notifications/Index', [
            'settings' => [
                'enabled' => $data['setting']->enabled,
                'environment_scope' => $data['setting']->environment_scope,
                'pending_threshold_minutes' => $data['setting']->pending_threshold_minutes,
                'minimum_amount' => $data['setting']->minimum_amount !== null ? (float) $data['setting']->minimum_amount : null,
            ],
            'recipients' => $data['recipients']->map(fn ($recipient) => [
                'id' => $recipient->id,
                'email' => $recipient->email,
                'active' => $recipient->active,
            ]),
            'preferences' => $data['preferences']->mapWithKeys(fn ($preference) => [
                $preference->event_type => $preference->enabled,
            ]),
            'events' => $data['events'],
            'global' => $data['global'],
            'deliveries' => $deliveries->through(fn ($delivery) => [
                'id' => $delivery->id,
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

    public function update(UpdateEmailNotificationsRequest $request): RedirectResponse
    {
        $this->notifications->updateMerchantSettings(Auth::id(), $request->validated());

        return back()->with('success', 'Email notification settings updated.');
    }
}
