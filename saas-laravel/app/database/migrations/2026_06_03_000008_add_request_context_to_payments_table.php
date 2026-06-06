<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            if (! Schema::hasColumn('payments', 'currency')) {
                $table->string('currency', 3)->default('USD')->after('environment')->index();
            }

            if (! Schema::hasColumn('payments', 'country')) {
                $table->string('country', 2)->nullable()->after('currency')->index();
            }

            if (! Schema::hasColumn('payments', 'locale')) {
                $table->string('locale', 20)->nullable()->after('country');
            }

            if (! Schema::hasColumn('payments', 'channel')) {
                $table->string('channel', 30)->nullable()->after('locale')->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            foreach (['channel', 'locale', 'country', 'currency'] as $column) {
                if (Schema::hasColumn('payments', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
