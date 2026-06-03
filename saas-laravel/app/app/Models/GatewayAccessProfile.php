<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;

class GatewayAccessProfile extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'api_key_hash',
        'merchant_api_key_id',
        'merchant_id',
        'merchant_name',
        'merchant_email',
        'merchant_status',
        'merchant_role',
        'api_key_status',
        'subscription_id',
        'subscription_name',
        'subscription_code',
        'subscription_status',
        'permissions',
        'allowed_routes',
        'allowed_providers',
        'rate_limit_per_minute',
        'cache_version',
        'synced_at',
        'revoked_at',
    ];

    protected $casts = [
        'permissions' => 'array',
        'allowed_routes' => 'array',
        'allowed_providers' => 'array',
        'synced_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];
}
