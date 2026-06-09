<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebhookDelivery extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'webhook_id',
        'payment_id',
        'event',
        'payload',
        'status',
        'attempts',
        'response_code',
        'response_body',
        'last_error',
        'next_retry_at',
        'delivered_at',
    ];

    protected $casts = [
        'payload'       => 'array',
        'attempts'      => 'integer',
        'response_code' => 'integer',
        'next_retry_at' => 'datetime',
        'delivered_at'  => 'datetime',
    ];

    public function webhook(): BelongsTo
    {
        return $this->belongsTo(MerchantWebhook::class, 'webhook_id');
    }
}
