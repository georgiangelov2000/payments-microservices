<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Contracts\Merchants\MerchantRepositoryInterface;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreApiKeyRequest;
use App\Http\Requests\Admin\UpdateApiKeyRequest;
use App\Models\MerchantApiKey;
use App\Services\ApiKeyService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class ApiKeyController extends Controller
{
    public function __construct(
        private readonly ApiKeyService $apiKeyService,
        private readonly MerchantRepositoryInterface $merchantRepository,
    ) {}

    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'merchant_id', 'environment', 'status']);
        $filters = array_filter($filters, fn ($value) => filled($value));

        return Inertia::render('Admin/ApiKeys/Index', [
            'generatedKey' => session('generated_api_key'),
            'merchants' => $this->merchantRepository->allForSelect(),
            'apiKeys' => $this->apiKeyService->list($filters),
            'filters' => $filters,
        ]);
    }

    public function store(StoreApiKeyRequest $request): RedirectResponse
    {
        $result = $this->apiKeyService->create($request->validated());

        return back()->with('generated_api_key', $result['plain_key']);
    }

    public function update(UpdateApiKeyRequest $request, MerchantApiKey $apiKey): RedirectResponse
    {
        $this->apiKeyService->update($apiKey, $request->validated());

        return back()->with('success', __('messages.api_keys.updated'));
    }

    public function rotate(MerchantApiKey $apiKey): RedirectResponse
    {
        $plain = $this->apiKeyService->rotate($apiKey);

        return back()->with('generated_api_key', $plain);
    }

    public function revoke(MerchantApiKey $apiKey): RedirectResponse
    {
        $this->apiKeyService->revoke($apiKey);

        return back()->with('success', __('messages.api_keys.revoked'));
    }

    public function destroy(MerchantApiKey $apiKey): RedirectResponse
    {
        abort_if($apiKey->status !== \App\Enums\MerchantAPIKeyStatus::INACTIVE, 403, 'Only revoked keys can be deleted.');

        $apiKey->delete();

        return back()->with('success', __('messages.api_keys.deleted'));
    }
}
