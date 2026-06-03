<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;

class RoutingAuditLog extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'actor_id',
        'merchant_id',
        'actor_type',
        'action',
        'subject_type',
        'subject_id',
        'before',
        'after',
    ];

    protected $casts = [
        'before' => 'array',
        'after' => 'array',
    ];
}
