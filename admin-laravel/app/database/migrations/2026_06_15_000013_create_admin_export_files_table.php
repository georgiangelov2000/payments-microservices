<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_export_files', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('admin_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type');
            $table->string('format', 10);
            $table->string('status', 20)->default('queued');
            $table->json('filters')->nullable();
            $table->string('filename')->nullable();
            $table->string('disk')->default('local');
            $table->string('path')->nullable();
            $table->string('mime')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->text('message')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamps();

            $table->index(['admin_user_id', 'type', 'created_at']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_export_files');
    }
};
