<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminExportFile extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'admin_user_id',
        'type',
        'format',
        'status',
        'filters',
        'filename',
        'disk',
        'path',
        'mime',
        'size',
        'message',
        'completed_at',
        'failed_at',
    ];

    protected $casts = [
        'filters' => 'array',
        'completed_at' => 'datetime',
        'failed_at' => 'datetime',
    ];

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }
}
