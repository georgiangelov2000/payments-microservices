<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderRoutingRule extends Model
{
    use HasUuidV7PrimaryKey;

    protected $table = 'provider_routing_rules';

    protected $casts = [
        'priority'   => 'integer',
        'enabled'    => 'boolean',
        'conditions' => 'array',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }
}
