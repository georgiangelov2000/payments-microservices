<?php

declare(strict_types=1);

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\Role;
use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, HasUuidV7PrimaryKey, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected $casts = [
        'role' => Role::class,
    ];

    public function isMerchant(): bool
    {
        return $this->role === Role::MERCHANT;
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'merchant_id');
    }

    public function apiKeys(): HasMany
    {
        return $this->hasMany(MerchantApiKey::class, 'merchant_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(UserSubscription::class);
    }

    public function routingConfigurations(): HasMany
    {
        return $this->hasMany(ProviderRoutingConfiguration::class, 'merchant_id');
    }

    public function routingRules(): HasMany
    {
        return $this->hasMany(ProviderRoutingRule::class, 'merchant_id');
    }
}
