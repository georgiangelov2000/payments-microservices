<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailNotificationSetting extends Model
{
    protected $primaryKey = 'merchant_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'merchant_id',
        'enabled',
        'environment_scope',
        'pending_threshold_minutes',
        'minimum_amount',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'pending_threshold_minutes' => 'integer',
        'minimum_amount' => 'decimal:8',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }
}
