<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\MerchantAPIKeyStatus;
use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MerchantApiKey extends Model
{
    use HasUuidV7PrimaryKey;

    protected $table = 'merchant_api_keys';

    protected $fillable = [
        'hash',
        'merchant_id',
        'status',
        'name',
        'environment',
        'key_prefix',
        'scopes',
        'last_rotated_at',
        'revoked_at',
    ];

    protected $casts = [
        'status' => MerchantAPIKeyStatus::class,
        'scopes' => 'array',
        'last_rotated_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }

    public function maskedKey(): string
    {
        return ($this->key_prefix ?: substr($this->hash, 0, 10)).'...';
    }
}
