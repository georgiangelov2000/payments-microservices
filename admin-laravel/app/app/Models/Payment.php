<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PaymentStatus;
use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string|null $currency
 * @property string|null $country
 * @property string|null $locale
 * @property string|null $channel
 */
class Payment extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'price',
        'amount',
        'merchant_id',
        'order_id',
        'provider_id',
        'provider_reference',
        'provider_checkout_url',
        'provider_status',
        'environment',
        'currency',
        'country',
        'locale',
        'channel',
        'routing_strategy',
        'idempotency_key',
        'routing_metadata',
        'status',
    ];

    protected $casts = [
        'price' => 'decimal:8',
        'amount' => 'decimal:8',
        'status' => PaymentStatus::class,
        'routing_metadata' => 'array',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class, 'provider_id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(PaymentLog::class, 'payment_id');
    }

    public function routingAttempts(): HasMany
    {
        return $this->hasMany(PaymentRoutingAttempt::class, 'payment_id');
    }
}
