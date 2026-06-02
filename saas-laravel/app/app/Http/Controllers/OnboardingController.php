<?php

namespace App\Http\Controllers;

use App\Enums\MerchantAPIKeyStatus;
use App\Models\MerchantApiKey;
use App\Models\Provider;
use App\Models\UserSubscription;
use App\Services\ApiKeyService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function __construct(
        private readonly ApiKeyService $apiKeyService,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $subscription = UserSubscription::query()
            ->with('subscription:id,name,monthly_fee,transaction_fee_percent,transaction_fee_fixed,included_transactions')
            ->where('user_id', $user->id)
            ->latest('id')
            ->first();

        $apiKeys = MerchantApiKey::query()
            ->where('merchant_id', $user->id)
            ->latest('id')
            ->get(['id', 'status', 'created_at']);

        $providers = Provider::query()
            ->whereIn('alias', ['stripe', 'paypal'])
            ->orderBy('alias')
            ->get(['name', 'alias'])
            ->map(fn (Provider $provider) => [
                'name' => $provider->name,
                'alias' => $provider->alias,
                'status' => 'sandbox_ready',
            ])
            ->values();

        return Inertia::render('Onboarding/Index', [
            'subscription' => $subscription ? [
                'id' => $subscription->id,
                'name' => $subscription->subscription?->name,
                'monthly_fee' => (float) $subscription->subscription?->monthly_fee,
                'transaction_fee_percent' => (float) $subscription->subscription?->transaction_fee_percent,
                'transaction_fee_fixed' => (float) $subscription->subscription?->transaction_fee_fixed,
                'included_transactions' => (int) $subscription->subscription?->included_transactions,
                'current_period_transactions' => (int) $subscription->current_period_transactions,
                'current_period_volume' => (float) $subscription->current_period_volume,
                'status' => $subscription->status->label(),
            ] : null,
            'apiKeys' => $apiKeys->map(fn (MerchantApiKey $key) => [
                'id' => $key->id,
                'status' => $key->status->label(),
                'created_at' => $key->created_at?->toISOString(),
            ]),
            'providers' => $providers,
            'gatewayEndpoint' => url('/api/v1/payments'),
            'gatewayPublicEndpoint' => config('services.payment_gateway.public_url'),
        ]);
    }

    public function generateApiKey(Request $request): RedirectResponse
    {
        $plainTextKey = $this->apiKeyService->generateForMerchant(
            $request->user()->id,
        );

        return redirect()
            ->route('onboarding.index')
            ->with('generated_api_key', $plainTextKey);
    }

    public function createTestPayment(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'api_key' => ['required', 'string'],
            'provider' => ['required', 'in:stripe,paypal'],
        ]);

        $gatewayUrl = rtrim(config('services.payment_gateway.internal_url'), '/');
        $orderId = now()->timestamp . random_int(100, 999);

        $response = Http::timeout(20)
            ->withHeaders([
                'X-Api-Key' => $validated['api_key'],
                'Content-Type' => 'application/json',
            ])
            ->post("{$gatewayUrl}/api/v1/payments", [
                'order_id' => $orderId,
                'amount' => 1,
                'price' => '10.00',
                'alias' => $validated['provider'],
            ]);

        if (!$response->successful()) {
            return redirect()
                ->route('onboarding.index')
                ->with('test_payment_error', $response->body());
        }

        return redirect()
            ->route('onboarding.index')
            ->with('test_payment', $response->json());
    }
}
