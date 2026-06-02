<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('gateway_access_profiles')) {
            Schema::create('gateway_access_profiles', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('api_key_hash', 64)->unique();
                $table->uuid('merchant_api_key_id')->index();
                $table->uuid('merchant_id')->index();
                $table->string('merchant_name');
                $table->string('merchant_email');
                $table->unsignedSmallInteger('merchant_status')->default(1)->index();
                $table->unsignedSmallInteger('merchant_role')->default(2);
                $table->unsignedSmallInteger('api_key_status')->default(1)->index();
                $table->uuid('subscription_id')->nullable()->index();
                $table->string('subscription_name')->nullable();
                $table->string('subscription_code', 50)->nullable();
                $table->unsignedSmallInteger('subscription_status')->nullable()->index();
                $table->json('permissions')->default('[]');
                $table->json('allowed_routes')->default('[]');
                $table->json('allowed_providers')->default('[]');
                $table->unsignedInteger('rate_limit_per_minute')->default(120);
                $table->unsignedBigInteger('cache_version')->default(1);
                $table->timestampTz('synced_at')->nullable();
                $table->timestampTz('revoked_at')->nullable();
                $table->timestampsTz();

                $table->index(['api_key_hash', 'api_key_status', 'merchant_status', 'subscription_status'], 'ix_gateway_access_fast_auth');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('gateway_access_profiles');
    }
};
