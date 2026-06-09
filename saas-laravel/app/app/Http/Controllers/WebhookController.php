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
use Illuminate\Support\Carbon;

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

    public function logs(Request $request): Response
    {
        $merchantId = Auth::id();

        $webhookIds = MerchantWebhook::query()
            ->where('merchant_id', $merchantId)
            ->pluck('id');

        $endpoints = MerchantWebhook::query()
            ->where('merchant_id', $merchantId)
            ->get(['id', 'url', 'description']);

        $query = WebhookDelivery::query()
            ->with(['webhook:id,url,description'])
            ->whereIn('webhook_id', $webhookIds)
            ->orderByDesc('created_at');

        if ($webhookId = $request->query('webhook_id')) {
            $query->where('webhook_id', $webhookId);
        }

        if ($event = $request->query('event')) {
            $query->where('event', $event);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($from = $request->query('from')) {
            $query->where('created_at', '>=', Carbon::parse($from)->startOfDay());
        }

        if ($to = $request->query('to')) {
            $query->where('created_at', '<=', Carbon::parse($to)->endOfDay());
        }

        $deliveries = $query->paginate(25)->withQueryString();

        return Inertia::render('Webhooks/Logs', [
            'deliveries' => $deliveries->through(fn ($d) => [
                'id'            => $d->id,
                'event'         => $d->event,
                'status'        => $d->status,
                'response_code' => $d->response_code,
                'response_body' => $d->response_body,
                'last_error'    => $d->last_error,
                'attempts'      => $d->attempts,
                'payload'       => $d->payload,
                'delivered_at'  => $d->delivered_at?->toIso8601String(),
                'next_retry_at' => $d->next_retry_at?->toIso8601String(),
                'created_at'    => $d->created_at?->toIso8601String(),
                'payment_id'    => $d->payment_id,
                'webhook_url'   => $d->webhook?->url,
                'webhook_desc'  => $d->webhook?->description,
            ]),
            'endpoints' => $endpoints->map(fn ($w) => [
                'id'   => $w->id,
                'url'  => $w->url,
                'desc' => $w->description,
            ]),
            'events'  => self::EVENTS,
            'filters' => $request->only(['webhook_id', 'event', 'status', 'from', 'to']),
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
