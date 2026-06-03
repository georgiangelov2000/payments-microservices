<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('provider_routing_configurations')) {
            Schema::create('provider_routing_configurations', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('merchant_id')->index();
                $table->string('environment', 20)->default('test')->index();
                $table->string('strategy', 30)->default('priority')->index();
                $table->boolean('enabled')->default(true)->index();
                $table->jsonb('priority_chain')->default('[]');
                $table->jsonb('failover_chain')->default('[]');
                $table->jsonb('weighted_distribution')->default('{}');
                $table->jsonb('metadata')->default('{}');
                $table->timestamps();

                $table->unique(['merchant_id', 'environment'], 'provider_routing_config_unique');
            });
        }

        if (! Schema::hasTable('provider_routing_rules')) {
            Schema::create('provider_routing_rules', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('merchant_id')->index();
                $table->string('name');
                $table->string('environment', 20)->default('test')->index();
                $table->string('provider_alias', 255)->index();
                $table->unsignedSmallInteger('priority')->default(100)->index();
                $table->boolean('enabled')->default(true)->index();
                $table->jsonb('conditions')->default('{}');
                $table->timestamps();

                $table->index(['merchant_id', 'environment', 'enabled', 'priority'], 'provider_routing_rules_lookup');
            });
        }

        if (! Schema::hasTable('provider_health_statuses')) {
            Schema::create('provider_health_statuses', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('provider_id')->nullable()->index();
                $table->uuid('merchant_id')->nullable()->index();
                $table->string('provider_alias', 255)->index();
                $table->string('environment', 20)->default('test')->index();
                $table->string('status', 30)->default('healthy')->index();
                $table->unsignedInteger('consecutive_failures')->default(0);
                $table->unsignedInteger('timeout_count')->default(0);
                $table->decimal('failure_rate', 5, 2)->default(0);
                $table->timestampTz('disabled_until')->nullable()->index();
                $table->timestampTz('last_success_at')->nullable();
                $table->timestampTz('last_failure_at')->nullable();
                $table->timestampTz('last_checked_at')->nullable();
                $table->text('last_error')->nullable();
                $table->jsonb('metadata')->default('{}');
                $table->timestamps();

                $table->unique(['merchant_id', 'provider_alias', 'environment'], 'provider_health_scope_unique');
                $table->index(['provider_alias', 'environment', 'status'], 'provider_health_status_lookup');
            });
        }

        if (! Schema::hasTable('payment_routing_attempts')) {
            Schema::create('payment_routing_attempts', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('payment_id')->nullable()->index();
                $table->uuid('merchant_id')->index();
                $table->uuid('provider_id')->nullable()->index();
                $table->string('provider_alias', 255)->index();
                $table->string('environment', 20)->default('test')->index();
                $table->string('strategy', 30)->index();
                $table->unsignedSmallInteger('attempt_number')->default(1);
                $table->string('status', 30)->index();
                $table->string('idempotency_key', 255)->nullable()->index();
                $table->unsignedInteger('latency_ms')->nullable();
                $table->text('error_code')->nullable();
                $table->text('error_message')->nullable();
                $table->jsonb('routing_snapshot')->default('{}');
                $table->timestamps();

                $table->index(['merchant_id', 'environment', 'created_at'], 'payment_routing_attempts_merchant_time');
                $table->index(['provider_alias', 'status', 'created_at'], 'payment_routing_attempts_provider_status');
            });
        }

        if (! Schema::hasTable('routing_audit_logs')) {
            Schema::create('routing_audit_logs', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('actor_id')->nullable()->index();
                $table->uuid('merchant_id')->nullable()->index();
                $table->string('actor_type', 30)->default('merchant')->index();
                $table->string('action', 100)->index();
                $table->string('subject_type', 100)->nullable();
                $table->uuid('subject_id')->nullable();
                $table->jsonb('before')->nullable();
                $table->jsonb('after')->nullable();
                $table->timestamps();
            });
        }

        Schema::table('payments', function (Blueprint $table) {
            if (! Schema::hasColumn('payments', 'environment')) {
                $table->string('environment', 20)->default('test')->after('provider_status')->index();
            }
            if (! Schema::hasColumn('payments', 'routing_strategy')) {
                $table->string('routing_strategy', 30)->nullable()->after('environment')->index();
            }
            if (! Schema::hasColumn('payments', 'idempotency_key')) {
                $table->string('idempotency_key', 255)->nullable()->after('routing_strategy')->index();
            }
            if (! Schema::hasColumn('payments', 'routing_metadata')) {
                $table->jsonb('routing_metadata')->nullable()->after('idempotency_key');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            foreach (['environment', 'routing_strategy', 'idempotency_key', 'routing_metadata'] as $column) {
                if (Schema::hasColumn('payments', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::dropIfExists('routing_audit_logs');
        Schema::dropIfExists('payment_routing_attempts');
        Schema::dropIfExists('provider_health_statuses');
        Schema::dropIfExists('provider_routing_rules');
        Schema::dropIfExists('provider_routing_configurations');
    }
};
