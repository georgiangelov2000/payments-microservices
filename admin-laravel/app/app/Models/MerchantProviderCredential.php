<?php

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MerchantProviderCredential extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'merchant_id',
        'provider_id',
        'environment',
        'display_name',
        'public_key',
        'secret_value',
        'status',
        'last_validated_at',
        'last_rotated_at',
    ];

    protected $casts = [
        'last_validated_at' => 'datetime',
        'last_rotated_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class);
    }

    public function maskedPublicKey(): ?string
    {
        if (!$this->public_key) {
            return null;
        }

        $length = strlen($this->public_key);

        if ($length <= 12) {
            return str_repeat('*', $length);
        }

        return substr($this->public_key, 0, 8) . '...' . substr($this->public_key, -4);
    }

    public function hasSecret(): bool
    {
        return filled($this->secret_value);
    }
}
