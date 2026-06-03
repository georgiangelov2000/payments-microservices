<?php

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoutingWorkflowVersion extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'workflow_id',
        'version',
        'status',
        'nodes',
        'edges',
        'validation_errors',
        'created_by',
        'published_at',
    ];

    protected $casts = [
        'version' => 'integer',
        'nodes' => 'array',
        'edges' => 'array',
        'validation_errors' => 'array',
        'published_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function workflow(): BelongsTo
    {
        return $this->belongsTo(RoutingWorkflow::class, 'workflow_id');
    }
}
