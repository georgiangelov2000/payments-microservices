<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('payments')) {
            Schema::create('payments', function (Blueprint $table) {
                $table->id();

                $table->decimal('price', 10, 8);
                $table->decimal('amount', 10, 8);

                $table->unsignedBigInteger('merchant_id');
                $table->unsignedBigInteger('order_id')->unique();
                $table->unsignedBigInteger('provider_id');

                $table->tinyInteger('status')
                    ->default(1)
                    ->comment('1 = pending, 2 = finished, 3 = failed');

                $table->timestamps();

                // Indexes
                $table->index('order_id', 'ix_payments_order_id');
                $table->index('merchant_id', 'ix_payments_merchant_id');
                $table->index('provider_id', 'ix_payments_provider_id');
                $table->index('status', 'ix_payments_status');
                $table->index('created_at', 'ix_payments_created_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
