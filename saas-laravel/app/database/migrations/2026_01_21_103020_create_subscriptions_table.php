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
        if(!Schema::hasTable('subscriptions')) {
            Schema::create('subscriptions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('name')->unique();
                $table->string('code', 50)->unique();
                $table->decimal('monthly_fee', 10, 2)->default('0.00');
                $table->decimal('transaction_fee_percent', 5, 2)->default('0.00');
                $table->decimal('transaction_fee_fixed', 10, 2)->default('0.00');
                $table->unsignedBigInteger('included_transactions')->default(0);
                $table->timestamps();

                $table->index('name','ix_subscription_plans_name');
                $table->index('code','ix_subscription_plans_code');
            });   
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
