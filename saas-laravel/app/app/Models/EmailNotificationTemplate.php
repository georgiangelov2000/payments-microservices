<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;

class EmailNotificationTemplate extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'event_type',
        'subject',
        'body',
        'enabled',
    ];

    protected $casts = [
        'enabled' => 'boolean',
    ];
}
