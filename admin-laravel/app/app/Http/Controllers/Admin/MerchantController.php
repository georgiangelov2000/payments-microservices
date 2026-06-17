<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexMerchantsRequest;
use App\Http\Requests\Admin\StoreMerchantRequest;
use App\Http\Requests\Admin\StoreProviderCredentialRequest;
use App\Http\Requests\Admin\UpdateMerchantRequest;
use App\Http\Requests\Admin\UpdateProviderCredentialRequest;
use App\Http\Resources\Admin\MerchantResource;
use App\Models\MerchantProviderCredential;
use App\Models\Provider;
use App\Models\User;
use App\Services\MerchantService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

final class MerchantController extends Controller
{
    public function __construct(
        private readonly MerchantService $merchantService,
    ) {}

    public function index(IndexMerchantsRequest $request): Response
    {
        $filters = $request->validated();

        return Inertia::render('Admin/Merchants/Index', [
            'availableProviders' => Provider::query()->orderBy('name')->get(['id', 'name', 'alias']),
            'filters' => $filters,
            'merchants' => $this->resolveResourcePaginator($this->merchantService->list($filters), MerchantResource::class),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Merchants/Create');
    }

    public function store(StoreMerchantRequest $request): RedirectResponse
    {
        $merchant = $this->merchantService->create($request->validated());

        return redirect()->route('admin.merchants.edit', $merchant)
            ->with('success', 'Merchant created. You can now assign payment providers.');
    }

    public function edit(User $merchant): Response
    {
        abort_unless($merchant->isMerchant(), 404);

        $merchant->loadCount(['payments', 'apiKeys', 'subscriptions'])
            ->load(['providerCredentials.provider', 'apiKeys']);

        return Inertia::render('Admin/Merchants/Edit', [
            'merchant' => $this->resolveResource($merchant, MerchantResource::class),
            'availableProviders' => Provider::query()->orderBy('name')->get(['id', 'name', 'alias']),
            'generatedKey' => session('generated_api_key'),
        ]);
    }

    public function update(UpdateMerchantRequest $request, User $merchant): RedirectResponse
    {
        abort_unless($merchant->isMerchant(), 404);
        $this->merchantService->update($merchant, $request->validated());

        return back()->with('success', 'Merchant updated.');
    }

    public function storeProvider(StoreProviderCredentialRequest $request, User $merchant): RedirectResponse
    {
        abort_unless($merchant->isMerchant(), 404);
        $this->merchantService->assignProvider($merchant, $request->validated());

        return back()->with('success', 'Provider assignment saved.');
    }

    public function updateProvider(UpdateProviderCredentialRequest $request, MerchantProviderCredential $credential): RedirectResponse
    {
        $this->merchantService->updateProviderCredential($credential, $request->validated());

        return back()->with('success', 'Provider credentials updated.');
    }
}
