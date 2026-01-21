<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if(!Schema::hasTable('api_requests')) {
            Schema::create('api_requests', function (Blueprint $table) {
                $table->id();

                // idempotency
                $table->string('event_id', 255)->unique();

                $table->unsignedBigInteger('subscription_id');
                $table->unsignedBigInteger('user_id');

                $table->unsignedBigInteger('payment_id');
                $table->decimal('amount', 10, 8);

                $table->string('source', 50);

                $table->timestamps();

                // -----------------------------
                // Indexes
                // -----------------------------
                $table->index('user_id', 'ix_api_requests_user_id');
                $table->index('subscription_id', 'ix_api_requests_subscription_id');
                $table->index('payment_id', 'ix_api_requests_payment_id');
                $table->index('source', 'ix_api_requests_source');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('api_requests');
    }
};
