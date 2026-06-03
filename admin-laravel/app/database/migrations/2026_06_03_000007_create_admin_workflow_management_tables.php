<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('merchant_api_keys')) {
            Schema::table('merchant_api_keys', function (Blueprint $table) {
                if (! Schema::hasColumn('merchant_api_keys', 'name')) {
                    $table->string('name')->nullable()->after('merchant_id');
                }

                if (! Schema::hasColumn('merchant_api_keys', 'environment')) {
                    $table->string('environment', 20)->default('test')->after('name');
                }

                if (! Schema::hasColumn('merchant_api_keys', 'key_prefix')) {
                    $table->string('key_prefix', 32)->nullable()->after('hash');
                }

                if (! Schema::hasColumn('merchant_api_keys', 'scopes')) {
                    $table->json('scopes')->nullable()->after('status');
                }

                if (! Schema::hasColumn('merchant_api_keys', 'last_rotated_at')) {
                    $table->timestamp('last_rotated_at')->nullable()->after('scopes');
                }

                if (! Schema::hasColumn('merchant_api_keys', 'revoked_at')) {
                    $table->timestamp('revoked_at')->nullable()->after('last_rotated_at');
                }
            });

            $this->createIndexIfMissing('merchant_api_keys', 'ix_merchant_api_keys_environment', ['environment']);
            $this->createIndexIfMissing('merchant_api_keys', 'ix_merchant_api_keys_key_prefix', ['key_prefix']);
        }

        if (! Schema::hasTable('routing_workflows')) {
            Schema::create('routing_workflows', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('merchant_id')->nullable()->index();
                $table->string('name');
                $table->string('environment', 20)->default('test')->index();
                $table->string('status', 20)->default('draft')->index();
                $table->unsignedInteger('current_version')->default(1);
                $table->json('nodes')->nullable();
                $table->json('edges')->nullable();
                $table->json('validation_errors')->nullable();
                $table->uuid('created_by')->nullable()->index();
                $table->uuid('updated_by')->nullable()->index();
                $table->uuid('published_by')->nullable()->index();
                $table->timestamp('published_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('routing_workflow_versions')) {
            Schema::create('routing_workflow_versions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('workflow_id')->index();
                $table->unsignedInteger('version');
                $table->string('status', 20)->default('draft');
                $table->json('nodes')->nullable();
                $table->json('edges')->nullable();
                $table->json('validation_errors')->nullable();
                $table->uuid('created_by')->nullable()->index();
                $table->timestamp('published_at')->nullable();
                $table->timestamps();

                $table->unique(['workflow_id', 'version'], 'ux_routing_workflow_versions_workflow_version');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('routing_workflow_versions');
        Schema::dropIfExists('routing_workflows');

        if (Schema::hasTable('merchant_api_keys')) {
            Schema::table('merchant_api_keys', function (Blueprint $table) {
                foreach (['revoked_at', 'last_rotated_at', 'scopes', 'key_prefix', 'environment', 'name'] as $column) {
                    if (Schema::hasColumn('merchant_api_keys', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }

    private function createIndexIfMissing(string $table, string $index, array $columns): void
    {
        $exists = DB::table('pg_indexes')
            ->where('schemaname', 'public')
            ->where('tablename', $table)
            ->where('indexname', $index)
            ->exists();

        if (! $exists) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->index($columns, $index));
        }
    }
};
