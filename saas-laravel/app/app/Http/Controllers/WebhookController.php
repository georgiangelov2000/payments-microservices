<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\MerchantWebhook;
use App\Models\WebhookDelivery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class WebhookController extends Controller
{
    public const EVENTS = [
        'payment.created',
        'payment.succeeded',
        'payment.failed',
        'payment.pending',
    ];

    public function index(): Response
    {
        $merchantId = Auth::id();

        $webhooks = MerchantWebhook::query()
            ->where('merchant_id', $merchantId)
            ->withCount([
                'deliveries',
                'deliveries as delivered_count' => fn ($q) => $q->where('status', 'delivered'),
            ])
            ->with(['deliveries' => fn ($q) => $q->orderByDesc('created_at')->limit(5)])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($w) => [
                'id'               => $w->id,
                'url'              => $w->url,
                'events'           => $w->events,
                'active'           => $w->active,
                'description'      => $w->description,
                'last_used_at'     => $w->last_used_at?->toIso8601String(),
                'deliveries_count' => $w->deliveries_count,
                'delivered_count'  => $w->delivered_count,
                'created_at'       => $w->created_at->toIso8601String(),
                'secret_hint'      => '••••••••' . substr($w->secret ?? '', -8),
                'recent_deliveries' => $w->deliveries->map(fn ($d) => [
                    'id'            => $d->id,
                    'event'         => $d->event,
                    'status'        => $d->status,
                    'response_code' => $d->response_code,
                    'last_error'    => $d->last_error,
                    'created_at'    => $d->created_at?->toIso8601String(),
                ]),
            ]);

        return Inertia::render('Webhooks/Index', [
            'webhooks'       => $webhooks,
            'availableEvents' => self::EVENTS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'url'         => 'required|url|max:500',
            'events'      => 'required|array|min:1',
            'events.*'    => 'string|in:' . implode(',', self::EVENTS),
            'description' => 'nullable|string|max:200',
        ]);

        MerchantWebhook::create([
            'merchant_id' => Auth::id(),
            'url'         => $validated['url'],
            'secret'      => Str::random(40),
            'events'      => $validated['events'],
            'description' => $validated['description'] ?? null,
            'active'      => true,
        ]);

        return back()->with('success', 'Webhook endpoint created.');
    }

    public function destroy(MerchantWebhook $webhook): RedirectResponse
    {
        abort_unless($webhook->merchant_id === Auth::id(), 403);

        $webhook->delete();

        return back()->with('success', 'Webhook endpoint deleted.');
    }

    public function test(MerchantWebhook $webhook): RedirectResponse
    {
        abort_unless($webhook->merchant_id === Auth::id(), 403);

        $payload   = ['event' => 'ping', 'message' => 'Test delivery from PayFlow', 'timestamp' => time()];
        $body      = json_encode($payload);
        $timestamp = time();
        $sig       = hash_hmac('sha256', "{$timestamp}.{$body}", $webhook->secret);

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Content-Type'        => 'application/json',
                    'X-PayFlow-Event'     => 'ping',
                    'X-PayFlow-Signature' => "t={$timestamp},v1={$sig}",
                ])
                ->post($webhook->url, $payload);

            $type    = $response->successful() ? 'success' : 'error';
            $message = $response->successful()
                ? "Test ping delivered (HTTP {$response->status()})."
                : "Test ping failed: HTTP {$response->status()}.";
        } catch (\Throwable $e) {
            $type    = 'error';
            $message = "Test ping failed: {$e->getMessage()}";
        }

        return back()->with($type, $message);
    }
}
