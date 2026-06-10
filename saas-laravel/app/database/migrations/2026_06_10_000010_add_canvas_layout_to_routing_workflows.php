<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('routing_workflows', function (Blueprint $table): void {
            // Stores merchant-saved node positions: {nodeId: {x, y}}
            // Kept separate from nodes/edges so the visual layout never
            // interferes with the actual routing logic.
            $table->json('canvas_layout')->nullable()->after('validation_errors');
        });
    }

    public function down(): void
    {
        Schema::table('routing_workflows', function (Blueprint $table): void {
            $table->dropColumn('canvas_layout');
        });
    }
};
