<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Provider extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'name',
        'alias',
        'url',
    ];

    public function merchantCredentials(): HasMany
    {
        return $this->hasMany(MerchantProviderCredential::class);
    }
}
