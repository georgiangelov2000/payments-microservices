<?php

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderHealthStatus extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'provider_id',
        'merchant_id',
        'provider_alias',
        'environment',
        'status',
        'consecutive_failures',
        'timeout_count',
        'failure_rate',
        'disabled_until',
        'last_success_at',
        'last_failure_at',
        'last_checked_at',
        'last_error',
        'metadata',
    ];

    protected $casts = [
        'consecutive_failures' => 'integer',
        'timeout_count' => 'integer',
        'failure_rate' => 'decimal:2',
        'disabled_until' => 'datetime',
        'last_success_at' => 'datetime',
        'last_failure_at' => 'datetime',
        'last_checked_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class);
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }
}
