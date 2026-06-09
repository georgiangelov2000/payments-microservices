<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MerchantWebhook extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'merchant_id',
        'url',
        'secret',
        'events',
        'active',
        'description',
        'last_used_at',
    ];

    protected $casts = [
        'events'       => 'array',
        'active'       => 'boolean',
        'last_used_at' => 'datetime',
    ];

    protected $hidden = ['secret'];

    public function deliveries(): HasMany
    {
        return $this->hasMany(WebhookDelivery::class, 'webhook_id');
    }
}
