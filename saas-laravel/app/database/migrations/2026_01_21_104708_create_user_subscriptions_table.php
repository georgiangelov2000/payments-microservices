<?php

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
        if(!Schema::hasTable('user_subscriptions')) {
            Schema::create('user_subscriptions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('subscription_id');
                $table->unsignedBigInteger('used_tokens')->default(0);
                $table->tinyInteger('status')
                        ->default(1)
                        ->comment('1 = active, 2 = inactive');
                $table->timestamps();


                $table->index("user_id", "ix_user_subscriptions_user_id");
                $table->index("subscription_id", "ix_user_subscriptions_subscription_id");
            });
        };
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_subscriptions');
    }
};
