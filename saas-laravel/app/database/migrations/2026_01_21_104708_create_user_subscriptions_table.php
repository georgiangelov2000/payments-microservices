<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('user_subscriptions')) {
            Schema::create('user_subscriptions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('user_id');
                $table->uuid('subscription_id');
                $table->unsignedBigInteger('current_period_transactions')->default(0);
                $table->decimal('current_period_volume', 18, 2)->default('0.00');
                $table->tinyInteger('status')
                    ->default(1)
                    ->comment('1 = active, 2 = inactive');
                $table->timestamps();

                $table->index('user_id', 'ix_user_subscriptions_user_id');
                $table->index('subscription_id', 'ix_user_subscriptions_subscription_id');
                $table->unique(['user_id', 'subscription_id'], 'uq_user_subscriptions_user_subscription');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_subscriptions');
    }
};
