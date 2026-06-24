<?php

declare(strict_types=1);

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\Role;
use App\Enums\UserStatus;
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
        'company_name',
        'legal_name',
        'logo_url',
        'website',
        'phone',
        'tax_id',
        'country',
        'city',
        'postal_code',
        'address_line1',
        'address_line2',
        'email',
        'password',
        'status',
        'role',
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
        'status' => UserStatus::class,
        'email_verified_at' => 'datetime',
    ];

    public function isAdmin(): bool
    {
        return $this->role === Role::ADMIN;
    }

    public function isMerchant(): bool
    {
        return $this->role === Role::MERCHANT;
    }

    public function isActive(): bool
    {
        return $this->status === UserStatus::ACTIVE;
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

    public function providerCredentials(): HasMany
    {
        return $this->hasMany(MerchantProviderCredential::class, 'merchant_id');
    }

    public function routingWorkflows(): HasMany
    {
        return $this->hasMany(RoutingWorkflow::class, 'merchant_id');
    }
}
