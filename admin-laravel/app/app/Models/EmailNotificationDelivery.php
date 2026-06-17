<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailNotificationDelivery extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'merchant_id',
        'payment_id',
        'order_id',
        'event_type',
        'recipient_email',
        'status',
        'idempotency_key',
        'attempts',
        'failure_reason',
        'sent_at',
    ];

    protected $casts = [
        'attempts' => 'integer',
        'sent_at' => 'datetime',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class, 'payment_id');
    }
}
