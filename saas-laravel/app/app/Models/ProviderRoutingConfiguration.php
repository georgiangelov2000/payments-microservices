<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderRoutingConfiguration extends Model
{
    use HasUuidV7PrimaryKey;

    protected $table = 'provider_routing_configurations';

    protected $casts = [
        'enabled'               => 'boolean',
        'priority_chain'        => 'array',
        'failover_chain'        => 'array',
        'weighted_distribution' => 'array',
        'metadata'              => 'array',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }
}
