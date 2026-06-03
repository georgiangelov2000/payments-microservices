<?php

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'name',
        'code',
        'monthly_fee',
        'transaction_fee_percent',
        'transaction_fee_fixed',
        'included_transactions',
    ];
    public $timestamps = false;

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function userSubscriptions(): HasMany
    {
        return $this->hasMany(UserSubscription::class);
    }
}
