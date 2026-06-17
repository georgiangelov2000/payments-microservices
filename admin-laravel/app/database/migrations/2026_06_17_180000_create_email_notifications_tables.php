<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('email_notification_settings')) {
            Schema::create('email_notification_settings', function (Blueprint $table): void {
                $table->uuid('merchant_id')->primary();
                $table->boolean('enabled')->default(true);
                $table->string('environment_scope', 10)->default('both');
                $table->unsignedInteger('pending_threshold_minutes')->default(60);
                $table->decimal('minimum_amount', 18, 8)->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('email_notification_recipients')) {
            Schema::create('email_notification_recipients', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('merchant_id')->index();
                $table->string('email');
                $table->boolean('active')->default(true);
                $table->timestamps();

                $table->unique(['merchant_id', 'email'], 'email_notification_recipient_unique');
            });
        }

        if (! Schema::hasTable('email_notification_event_preferences')) {
            Schema::create('email_notification_event_preferences', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('merchant_id')->index();
                $table->string('event_type', 80);
                $table->boolean('enabled')->default(false);
                $table->unsignedInteger('threshold_minutes')->nullable();
                $table->decimal('minimum_amount', 18, 8)->nullable();
                $table->timestamps();

                $table->unique(['merchant_id', 'event_type'], 'email_notification_preference_unique');
            });
        }

        if (! Schema::hasTable('email_notification_global_settings')) {
            Schema::create('email_notification_global_settings', function (Blueprint $table): void {
                $table->string('key')->primary();
                $table->json('value')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('email_notification_templates')) {
            Schema::create('email_notification_templates', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('event_type', 80)->unique();
                $table->string('subject');
                $table->text('body');
                $table->boolean('enabled')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('email_notification_deliveries')) {
            Schema::create('email_notification_deliveries', function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->uuid('merchant_id')->index();
                $table->uuid('payment_id')->nullable()->index();
                $table->string('order_id')->nullable()->index();
                $table->string('event_type', 80)->index();
                $table->string('recipient_email');
                $table->string('status', 30)->default('pending')->index();
                $table->string('idempotency_key')->unique();
                $table->unsignedInteger('attempts')->default(0);
                $table->text('failure_reason')->nullable();
                $table->timestamp('sent_at')->nullable();
                $table->timestamps();

                $table->index(['merchant_id', 'event_type', 'created_at'], 'email_notification_delivery_lookup');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('email_notification_deliveries');
        Schema::dropIfExists('email_notification_templates');
        Schema::dropIfExists('email_notification_global_settings');
        Schema::dropIfExists('email_notification_event_preferences');
        Schema::dropIfExists('email_notification_recipients');
        Schema::dropIfExists('email_notification_settings');
    }
};
