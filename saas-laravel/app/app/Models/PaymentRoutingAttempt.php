<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentRoutingAttempt extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'payment_id',
        'merchant_id',
        'provider_id',
        'provider_alias',
        'environment',
        'strategy',
        'attempt_number',
        'status',
        'idempotency_key',
        'latency_ms',
        'error_code',
        'error_message',
        'routing_snapshot',
    ];

    protected $casts = [
        'attempt_number' => 'integer',
        'latency_ms' => 'integer',
        'routing_snapshot' => 'array',
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class);
    }
}
