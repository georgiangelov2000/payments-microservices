<?php

namespace App\Models;

use App\Enums\PaymentLogEventStatus;
use App\Enums\PaymentLogStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentLog extends Model
{
    protected $connection = 'pgsql_logs';

    protected $table = 'payment_logs';

    protected $fillable = [
        'payment_id',
        'event_type',
        'status',
        'message',
        'payload',
    ];

    public $timestamps = false; // created_at only, handled by DB

    protected $casts = [
        'event_type' => PaymentLogEventStatus::class,
        'status'     => PaymentLogStatus::class,
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class, 'payment_id');
    }
}
