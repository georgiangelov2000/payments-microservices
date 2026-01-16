<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApiRequest extends Model
{
    protected $table = 'api_requests';

    protected $fillable = [
        'event_id',
        'subscription_id',
        'user_id',
        'amount',
        'ts',
        'source',
        'order_id'
    ];

    protected $casts = [
        'amount' => 'float',
        'ts' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
