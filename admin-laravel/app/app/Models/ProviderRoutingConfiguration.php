<?php

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderRoutingConfiguration extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'merchant_id',
        'environment',
        'strategy',
        'enabled',
        'priority_chain',
        'failover_chain',
        'weighted_distribution',
        'metadata',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'priority_chain' => 'array',
        'failover_chain' => 'array',
        'weighted_distribution' => 'array',
        'metadata' => 'array',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }
}
