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
use Inertia\Inertia;
use Inertia\Response;

final class ApiKeyController extends Controller
{
    public function __construct(
        private readonly ApiKeyService $apiKeyService,
        private readonly MerchantRepositoryInterface $merchantRepository,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Admin/ApiKeys/Index', [
            'generatedKey' => session('generated_api_key'),
            'merchants' => $this->merchantRepository->allForSelect(),
            'apiKeys' => $this->apiKeyService->list(),
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

        return back()->with('success', 'API key updated.');
    }

    public function rotate(MerchantApiKey $apiKey): RedirectResponse
    {
        $plain = $this->apiKeyService->rotate($apiKey);

        return back()->with('generated_api_key', $plain);
    }

    public function revoke(MerchantApiKey $apiKey): RedirectResponse
    {
        $this->apiKeyService->revoke($apiKey);

        return back()->with('success', 'API key revoked.');
    }
}
