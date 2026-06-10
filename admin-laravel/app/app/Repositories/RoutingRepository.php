<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Routing\RoutingRepositoryInterface;
use App\Models\PaymentRoutingAttempt;
use App\Models\ProviderHealthStatus;
use App\Models\ProviderRoutingConfiguration;
use App\Models\ProviderRoutingRule;
use App\Models\RoutingAuditLog;
use App\Models\RoutingWorkflow;
use App\Models\RoutingWorkflowVersion;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
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

    public function paginateWorkflows(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = RoutingWorkflow::query()
            ->with(['merchant:id,name,email', 'versions'])
            ->latest();

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhereHas('merchant', fn ($mq) => $mq->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%"));
            });
        }

        if (!empty($filters['environment']) && in_array($filters['environment'], ['test', 'live'], true)) {
            $query->where('environment', $filters['environment']);
        }

        if (!empty($filters['status']) && in_array($filters['status'], ['draft', 'published'], true)) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['merchant_id'])) {
            $query->where('merchant_id', $filters['merchant_id']);
        }

        return $query->paginate($perPage)->withQueryString();
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
        return RoutingWorkflowVersion::query()->create($data);
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

    public function createAuditLog(array $data): void
    {
        RoutingAuditLog::query()->create($data);
    }
}
