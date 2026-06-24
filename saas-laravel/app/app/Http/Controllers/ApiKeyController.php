<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\MerchantAPIKeyStatus;
use App\Http\Requests\ApiKeyRequest;
use App\Http\Resources\ApiKeyResource;
use App\Models\MerchantApiKey;
use App\Services\ApiKeyService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

final class ApiKeyController extends Controller
{
    public function __construct(
        private readonly ApiKeyService $apiKeyService
    ) {}

    public function index(ApiKeyRequest $request): Response
    {
        $params = $request->safe()->toArray();

        return Inertia::render('ApiKeys/Index', [
            'keys' => $this->resolveResourcePaginator($this->apiKeyService->fetchAll($params), ApiKeyResource::class),
            'filters' => [
                'hash' => $request->query('hash', ''),
                'environment' => $request->query('environment', ''),
                'status' => $request->query('status', ''),
            ],
        ]);
    }

    /**
     * Explicitly revoke a single API key.
     * Only the owning merchant can revoke their own key.
     */
    public function destroy(string $id): RedirectResponse
    {
        $key = MerchantApiKey::query()
            ->where('id', $id)
            ->where('merchant_id', auth()->id())
            ->where('status', MerchantAPIKeyStatus::ACTIVE)
            ->firstOrFail();

        $key->update([
            'status' => MerchantAPIKeyStatus::INACTIVE,
            'revoked_at' => now(),
        ]);

        $this->apiKeyService->syncRevokedKey($key);

        return redirect()
            ->route('api-keys.index')
            ->with('success', __('messages.api_keys.revoked'));
    }
}
