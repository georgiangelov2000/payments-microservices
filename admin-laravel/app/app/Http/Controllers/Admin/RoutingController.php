<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Contracts\Merchants\MerchantRepositoryInterface;
use App\Contracts\Routing\RoutingRepositoryInterface;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreWorkflowRequest;
use App\Http\Requests\Admin\UpdateWorkflowRequest;
use App\Models\Provider;
use App\Models\RoutingWorkflow;
use App\Models\RoutingWorkflowVersion;
use App\Services\RoutingWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class RoutingController extends Controller
{
    public function __construct(
        private readonly RoutingWorkflowService $routingService,
        private readonly RoutingRepositoryInterface $routingRepository,
        private readonly MerchantRepositoryInterface $merchantRepository,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Admin/Routing/Index', [
            'summary' => $this->routingRepository->summary(),
            'merchants' => $this->merchantRepository->allForSelect()->map(fn ($merchant) => [
                'id' => $merchant->id,
                'name' => $merchant->name,
                'email' => $merchant->email,
                'providers' => $merchant->providerCredentials
                    ->filter(fn ($cred) => in_array($cred->status, ['active', 'validated'], true))
                    ->map(fn ($cred) => [
                        'id' => $cred->provider?->id,
                        'name' => $cred->provider?->name,
                        'alias' => $cred->provider?->alias,
                        'environment' => $cred->environment,
                        'credential_status' => $cred->status,
                    ])->values(),
            ]),
            'providers' => Provider::query()->orderBy('name')->get(['id', 'name', 'alias']),
            'workflows' => $this->routingRepository->recentWorkflows()->map(
                fn ($workflow) => $this->routingService->serializeWorkflow($workflow)
            ),
            'health' => $this->routingRepository->getHealthStatuses(),
            'configurations' => $this->routingRepository->getConfigurations(),
            'attempts' => $this->routingRepository->getAttempts(),
            'audits' => $this->routingRepository->getAuditLogs(),
        ]);
    }

    public function builder(RoutingWorkflow $workflow): Response
    {
        $merchant = $workflow->merchant;
        $merchantProviders = $merchant
            ? $merchant->providerCredentials()
                ->with('provider:id,name,alias')
                ->whereIn('status', ['active', 'validated', 'pending'])
                ->get()
                ->map(fn ($cred) => [
                    'id' => $cred->provider->id,
                    'name' => $cred->provider->name,
                    'alias' => $cred->provider->alias,
                    'environment' => $cred->environment,
                    'status' => $cred->status,
                ])->values()->all()
            : [];

        return Inertia::render('Admin/Routing/Builder', [
            'workflow' => [
                'id' => $workflow->id,
                'name' => $workflow->name,
                'environment' => $workflow->environment,
                'status' => $workflow->status,
                'current_version' => $workflow->current_version,
                'nodes' => $workflow->nodes ?? [],
                'edges' => $workflow->edges ?? [],
                'validation_errors' => $workflow->validation_errors ?? [],
                'merchant' => $merchant ? ['id' => $merchant->id, 'name' => $merchant->name] : null,
                'versions' => $workflow->versions()
                    ->orderByDesc('version')
                    ->get(['id', 'version', 'name', 'status', 'published_at', 'created_at'])
                    ->toArray(),
            ],
            'providers' => Provider::query()->orderBy('name')->get(['id', 'name', 'alias'])->toArray(),
            'merchantProviders' => $merchantProviders,
        ]);
    }

    public function storeWorkflow(StoreWorkflowRequest $request): RedirectResponse
    {
        $this->routingService->createWorkflow($request->validated());

        return back()->with('success', 'Routing workflow created.');
    }

    public function updateWorkflow(UpdateWorkflowRequest $request, RoutingWorkflow $workflow): RedirectResponse
    {
        $this->routingService->updateWorkflow($workflow, $request->validated());

        return back()->with('success', 'Routing workflow saved.');
    }

    public function publishWorkflow(RoutingWorkflow $workflow): RedirectResponse
    {
        try {
            $this->routingService->publishWorkflow($workflow);
        } catch (\DomainException $e) {
            return back()->withErrors(['workflow' => $e->getMessage()]);
        }

        return back()->with('success', 'Routing workflow published.');
    }

    public function rollbackWorkflow(RoutingWorkflow $workflow, RoutingWorkflowVersion $version): RedirectResponse
    {
        $this->routingService->rollbackWorkflow($workflow, $version);

        return back()->with('success', 'Workflow rolled back as a new draft.');
    }

    public function updateWorkflowVersion(
        Request $request,
        RoutingWorkflow $workflow,
        RoutingWorkflowVersion $version,
    ): RedirectResponse {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $this->routingService->renameVersion($workflow, $version, $data['name'] ?? null);

        return back()->with('success', 'Workflow version renamed.');
    }

    public function deleteWorkflowVersion(
        RoutingWorkflow $workflow,
        RoutingWorkflowVersion $version,
    ): RedirectResponse {
        try {
            $this->routingService->deleteVersion($workflow, $version);
        } catch (\DomainException $e) {
            return back()->withErrors(['version' => $e->getMessage()]);
        }

        return back()->with('success', 'Workflow version deleted.');
    }

    public function simulateWorkflow(Request $request, RoutingWorkflow $workflow): JsonResponse
    {
        $data = $request->validate([
            'input' => ['required', 'array'],
            'input.country' => ['nullable', 'string'],
            'input.currency' => ['nullable', 'string'],
            'input.price' => ['nullable', 'numeric'],
            'input.payment_method' => ['nullable', 'string'],
            'input.recurring' => ['nullable', 'boolean'],
        ]);

        $result = $this->routingService->simulate(
            $workflow->nodes ?? [],
            $workflow->edges ?? [],
            $data['input'],
        );

        return response()->json($result);
    }
}
