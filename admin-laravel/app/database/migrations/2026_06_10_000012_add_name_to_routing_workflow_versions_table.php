<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('routing_workflow_versions', function (Blueprint $table): void {
            if (! Schema::hasColumn('routing_workflow_versions', 'name')) {
                $table->string('name')->nullable()->after('version');
            }
        });
    }

    public function down(): void
    {
        Schema::table('routing_workflow_versions', function (Blueprint $table): void {
            if (Schema::hasColumn('routing_workflow_versions', 'name')) {
                $table->dropColumn('name');
            }
        });
    }
};
