<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('merchant_provider_credentials')) {
            return;
        }

        Schema::create('merchant_provider_credentials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('merchant_id')->index();
            $table->uuid('provider_id')->index();
            $table->string('environment', 20)->default('test');
            $table->string('display_name')->nullable();
            $table->string('public_key')->nullable();
            $table->text('secret_value')->nullable();
            $table->string('status', 30)->default('pending')->index();
            $table->timestamp('last_validated_at')->nullable();
            $table->timestamp('last_rotated_at')->nullable();
            $table->timestamps();

            $table->unique(
                ['merchant_id', 'provider_id', 'environment'],
                'merchant_provider_credentials_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchant_provider_credentials');
    }
};
