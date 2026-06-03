<?php
namespace App\Repositories;

use App\Contracts\Routing\RoutingRepositoryInterface;
use App\Models\PaymentRoutingAttempt;
use App\Models\ProviderHealthStatus;
use App\Models\ProviderRoutingConfiguration;
use App\Models\ProviderRoutingRule;
use App\Models\RoutingAuditLog;
use App\Models\RoutingWorkflow;
use App\Models\RoutingWorkflowVersion;
use Illuminate\Database\Eloquent\Collection;

final class RoutingRepository implements RoutingRepositoryInterface
{
    public function summary(): array
    {
        return [
            'configs' => ProviderRoutingConfiguration::query()->count(),
            'rules' => ProviderRoutingRule::query()->count(),
            'unhealthyProviders' => ProviderHealthStatus::query()->where('status', 'unhealthy')->count(),
            'failedAttempts' => PaymentRoutingAttempt::query()->whereIn('status', ['failed', 'timeout'])->count(),
            'workflows' => RoutingWorkflow::query()->count(),
            'publishedWorkflows' => RoutingWorkflow::query()->where('status', 'published')->count(),
        ];
    }

    public function recentWorkflows(int $limit = 25): Collection
    {
        return RoutingWorkflow::query()
            ->with(['merchant:id,name,email', 'versions'])
            ->latest()
            ->limit($limit)
            ->get();
    }

    public function createWorkflow(array $data): RoutingWorkflow
    {
        return RoutingWorkflow::query()->create($data);
    }

    public function updateWorkflow(RoutingWorkflow $workflow, array $data): RoutingWorkflow
    {
        $workflow->update($data);
        return $workflow->fresh();
    }

    public function createVersion(array $data): RoutingWorkflowVersion
    {
        return RoutingWorkflowVersion::query()->updateOrCreate(
            ['workflow_id' => $data['workflow_id'], 'version' => $data['version']],
            $data
        );
    }

    public function getHealthStatuses(int $limit = 50): Collection
    {
        return ProviderHealthStatus::query()
            ->with(['merchant:id,name,email'])
            ->latest('updated_at')
            ->limit($limit)
            ->get();
    }

    public function getConfigurations(int $limit = 50): Collection
    {
        return ProviderRoutingConfiguration::query()
            ->with(['merchant:id,name,email'])
            ->latest()
            ->limit($limit)
            ->get();
    }

    public function getAttempts(int $limit = 50): Collection
    {
        return PaymentRoutingAttempt::query()
            ->with(['merchant:id,name,email'])
            ->latest()
            ->limit($limit)
            ->get();
    }

    public function getAuditLogs(int $limit = 25): Collection
    {
        return RoutingAuditLog::query()
            ->latest()
            ->limit($limit)
            ->get();
    }
}
