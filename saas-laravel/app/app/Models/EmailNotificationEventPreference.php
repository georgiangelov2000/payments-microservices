<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailNotificationEventPreference extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'merchant_id',
        'event_type',
        'enabled',
        'threshold_minutes',
        'minimum_amount',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'threshold_minutes' => 'integer',
        'minimum_amount' => 'decimal:8',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }
}
