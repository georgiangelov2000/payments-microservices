<?php

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Enums\MerchantAPIKeyStatus;

class MerchantApiKey extends Model
{
    use HasUuidV7PrimaryKey;

    protected $table = 'merchant_api_keys';
    
    protected $fillable = [
        'hash',
        'key_prefix',
        'merchant_id',
        'name',
        'environment',
        'status',
        'scopes',
        'last_rotated_at',
        'revoked_at',
    ];

    protected $casts = [
        'status' => MerchantAPIKeyStatus::class,
        'scopes' => 'array',
        'last_rotated_at' => 'datetime',
        'revoked_at' => 'datetime',
        'created_at' => "datetime",
        "updated_at" => "datetime"
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }

    public function maskedKey(): string
    {
        return ($this->key_prefix ?: substr($this->hash, 0, 10)) . '...';
    }
}
