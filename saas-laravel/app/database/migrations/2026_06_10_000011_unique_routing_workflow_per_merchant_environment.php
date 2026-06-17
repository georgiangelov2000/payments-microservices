<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Enforce at most one routing workflow per (merchant_id, environment) pair.
     *
     * Uses a partial unique index so NULL merchant_id rows (system-level
     * workflows without an owner) are excluded from the constraint.
     */
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        // Guard: deduplicate any existing rows before adding the constraint.
        // Keep the most-recently-updated row for each (merchant_id, environment) pair;
        // soft-delete all earlier duplicates by marking them 'archived'.
        DB::statement("
            UPDATE routing_workflows
               SET status = 'archived'
             WHERE id NOT IN (
                 SELECT DISTINCT ON (merchant_id, environment) id
                   FROM routing_workflows
                  WHERE merchant_id IS NOT NULL
                  ORDER BY merchant_id, environment, updated_at DESC
             )
               AND merchant_id IS NOT NULL
               AND status != 'archived'
        ");

        $indexExists = DB::table('pg_indexes')
            ->where('schemaname', 'public')
            ->where('tablename', 'routing_workflows')
            ->where('indexname', 'ux_routing_workflows_merchant_environment')
            ->exists();

        if (! $indexExists) {
            DB::statement('
                CREATE UNIQUE INDEX ux_routing_workflows_merchant_environment
                    ON routing_workflows (merchant_id, environment)
                 WHERE merchant_id IS NOT NULL
            ');
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS ux_routing_workflows_merchant_environment');
    }
};
