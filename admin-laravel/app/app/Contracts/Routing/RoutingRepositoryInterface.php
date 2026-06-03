<?php
namespace App\Contracts\Routing;

use App\Models\RoutingWorkflow;
use Illuminate\Database\Eloquent\Collection;

interface RoutingRepositoryInterface
{
    public function summary(): array;
    public function recentWorkflows(int $limit = 25): Collection;
    public function createWorkflow(array $data): RoutingWorkflow;
    public function updateWorkflow(RoutingWorkflow $workflow, array $data): RoutingWorkflow;
}
