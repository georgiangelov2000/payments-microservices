<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoutingWorkflowVersion extends Model
{
    use HasUuidV7PrimaryKey;

    protected $table = 'routing_workflow_versions';

    protected $casts = [
        'version'           => 'integer',
        'nodes'             => 'array',
        'edges'             => 'array',
        'validation_errors' => 'array',
        'published_at'      => 'datetime',
    ];

    public function workflow(): BelongsTo
    {
        return $this->belongsTo(RoutingWorkflow::class, 'workflow_id');
    }
}
