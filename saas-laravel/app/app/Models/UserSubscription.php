<?php

namespace App\Models;
use App\Enums\SubscriptionStatus;
use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;

class UserSubscription extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'user_id',
        'subscription_id',
        'status',
        'created_at',
        'updated_at',
        'current_period_transactions',
        'current_period_volume',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'status' => SubscriptionStatus::class,
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function subscription()
    {
        return $this->belongsTo(Subscription::class);
    }
}
