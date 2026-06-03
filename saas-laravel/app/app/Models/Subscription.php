<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;

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
}
