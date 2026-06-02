<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
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
}
