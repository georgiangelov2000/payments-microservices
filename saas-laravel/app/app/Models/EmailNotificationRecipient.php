<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailNotificationRecipient extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'merchant_id',
        'email',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }
}
