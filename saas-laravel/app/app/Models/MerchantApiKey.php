<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Enums\MerchantAPIKeyStatus;

class MerchantApiKey extends Model
{
    protected $table = 'merchant_api_keys';

    protected $fillable = [
        'hash',
        'merchant_id',
        'status',
    ];

    protected $casts = [
        'status' => MerchantAPIKeyStatus::class,
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }
}
