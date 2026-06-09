<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Merchant webhook endpoint configurations
        Schema::create('merchant_webhooks', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('merchant_id')->index();
            $table->string('url');
            $table->string('secret', 64);  // HMAC-SHA256 signing secret
            $table->json('events')->default('["payment.created","payment.succeeded","payment.failed"]');
            $table->boolean('active')->default(true);
            $table->string('description')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
        });

        // Delivery log + retry queue
        Schema::create('webhook_deliveries', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('webhook_id')->index();
            $table->uuid('payment_id')->nullable()->index();
            $table->string('event');           // e.g. payment.succeeded
            $table->json('payload');
            $table->enum('status', ['pending', 'delivered', 'failed', 'retrying'])->default('pending')->index();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->unsignedSmallInteger('response_code')->nullable();
            $table->text('response_body')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamp('next_retry_at')->nullable()->index();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->foreign('webhook_id')->references('id')->on('merchant_webhooks')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_deliveries');
        Schema::dropIfExists('merchant_webhooks');
    }
};
