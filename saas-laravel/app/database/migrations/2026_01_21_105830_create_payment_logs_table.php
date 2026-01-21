<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if(!Schema::hasTable('payment_logs')) {
            Schema::create('payment_logs', function (Blueprint $table) {
                $table->id(); 

                $table->unsignedBigInteger('payment_id');

                // mapped in code (source of event)
                $table->smallInteger('event_type')
                    ->comment('Mapped in code: source/type of event');

                $table->tinyIncrements('status')
                    ->comment('1 = pending, 1 = success, 3 = failed')
                    ->default(1);

                // short human-readable message
                $table->string('message', 500)->nullable();

                // serialized context / error data (JSON string if needed)
                $table->string('payload', 500)->nullable();

                $table->timestamps();

                // -----------------------------
                // Indexes
                // -----------------------------
                $table->index('payment_id', 'ix_payment_logs_payment_id');
                $table->index('event_type', 'ix_payment_logs_event_type');
                $table->index('status', 'ix_payment_logs_status');
                $table->index('created_at', 'ix_payment_logs_created_at');
            });
        };
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_logs');
    }
};
