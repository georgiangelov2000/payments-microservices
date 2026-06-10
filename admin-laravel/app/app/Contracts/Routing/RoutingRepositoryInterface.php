<?php

declare(strict_types=1);

namespace App\Contracts\Routing;

use App\Models\RoutingWorkflow;
use App\Models\RoutingWorkflowVersion;
use Illuminate\Database\Eloquent\Collection;

interface RoutingRepositoryInterface
{
    public function summary(): array;

    public function recentWorkflows(int $limit = 25): Collection;

    public function createWorkflow(array $data): RoutingWorkflow;

    public function updateWorkflow(RoutingWorkflow $workflow, array $data): RoutingWorkflow;

    public function createVersion(array $data): RoutingWorkflowVersion;

    public function getHealthStatuses(int $limit = 50): Collection;

    public function getConfigurations(int $limit = 50): Collection;

    public function getAttempts(int $limit = 50): Collection;

    public function getAuditLogs(int $limit = 25): Collection;

    public function createAuditLog(array $data): void;
}
