<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRoutingRuleRequest;
use App\Http\Requests\UpdateRoutingRequest;
use App\Models\ProviderHealthStatus;
use App\Models\ProviderRoutingConfiguration;
use App\Models\ProviderRoutingRule;
use App\Services\RoutingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class RoutingController extends Controller
{
    public function __construct(private readonly RoutingService $routingService) {}

    public function index(Request $request): Response
    {
        $merchant    = Auth::user();
        $environment = $request->query('environment', 'test');
        $providers   = $this->routingService->getAvailableProviders($merchant->id, $environment);
        $configuration = $this->routingService->getOrCreateConfiguration($merchant->id, $environment);

        return Inertia::render('Routing/Index', [
            'environment'   => $environment,
            'providers'     => $providers,
            'configuration' => $configuration,
            'rules'         => ProviderRoutingRule::query()
                ->where('merchant_id', $merchant->id)
                ->where('environment', $environment)
                ->orderBy('priority')
                ->get(),
            'health'        => ProviderHealthStatus::query()
                ->where('merchant_id', $merchant->id)
                ->where('environment', $environment)
                ->get()
                ->keyBy('provider_alias'),
        ]);
    }

    public function update(UpdateRoutingRequest $request): RedirectResponse
    {
        $merchant  = Auth::user();
        $validated = $request->validated();

        $allowed                         = $this->routingService->getAvailableProviders($merchant->id, $validated['environment'])->pluck('alias')->all();
        $validated['priority_chain']     = $this->routingService->filterAliases($validated['priority_chain'] ?? [], $allowed);
        $validated['failover_chain']     = $this->routingService->filterAliases($validated['failover_chain'] ?? [], $allowed);
        $validated['weighted_distribution'] = array_intersect_key(
            $validated['weighted_distribution'] ?? [],
            array_flip($allowed)
        );

        $configuration = ProviderRoutingConfiguration::query()->firstOrNew([
            'merchant_id' => $merchant->id,
            'environment' => $validated['environment'],
        ]);

        $before = $configuration->exists ? $configuration->toArray() : null;
        $configuration->fill($validated);
        $configuration->save();

        $this->routingService->recordAudit($merchant->id, $merchant->id, 'merchant.updated_routing_configuration', $configuration, $before);

        return back()->with('status', 'Routing configuration updated.');
    }

    public function storeRule(StoreRoutingRuleRequest $request): RedirectResponse
    {
        $merchant  = Auth::user();
        $validated = $request->validated();

        $allowed = $this->routingService->getAvailableProviders($merchant->id, $validated['environment'])->pluck('alias')->all();
        abort_unless(in_array($validated['provider_alias'], $allowed, true), 403);

        $rule = ProviderRoutingRule::query()->create([
            ...$validated,
            'merchant_id' => $merchant->id,
            'conditions'  => $validated['conditions'] ?? [],
        ]);

        $this->routingService->recordAudit($merchant->id, $merchant->id, 'merchant.created_routing_rule', $rule, null);

        return back()->with('status', 'Routing rule created.');
    }

    public function destroyRule(ProviderRoutingRule $rule): RedirectResponse
    {
        abort_unless($rule->merchant_id === Auth::id(), 403);
        $before = $rule->toArray();
        $rule->delete();

        $this->routingService->recordAudit(Auth::id(), Auth::id(), 'merchant.deleted_routing_rule', $rule, $before);

        return back()->with('status', 'Routing rule deleted.');
    }
}
