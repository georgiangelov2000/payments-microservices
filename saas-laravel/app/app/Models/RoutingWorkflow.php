<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RoutingWorkflow extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'merchant_id', 'name', 'environment', 'status', 'current_version',
        'nodes', 'edges', 'validation_errors',
        'created_by', 'updated_by', 'published_by', 'published_at',
    ];

    protected $casts = [
        'nodes'             => 'array',
        'edges'             => 'array',
        'validation_errors' => 'array',
        'current_version'   => 'integer',
        'published_at'      => 'datetime',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(RoutingWorkflowVersion::class, 'workflow_id');
    }
}
