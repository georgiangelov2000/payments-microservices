<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'provider_reference')) {
                $table->string('provider_reference')->nullable()->after('provider_id');
                $table->index('provider_reference', 'ix_payments_provider_reference');
            }

            if (!Schema::hasColumn('payments', 'provider_checkout_url')) {
                $table->string('provider_checkout_url', 2048)->nullable()->after('provider_reference');
            }

            if (!Schema::hasColumn('payments', 'provider_status')) {
                $table->string('provider_status', 100)->nullable()->after('provider_checkout_url');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'provider_status')) {
                $table->dropColumn('provider_status');
            }

            if (Schema::hasColumn('payments', 'provider_checkout_url')) {
                $table->dropColumn('provider_checkout_url');
            }

            if (Schema::hasColumn('payments', 'provider_reference')) {
                $table->dropIndex('ix_payments_provider_reference');
                $table->dropColumn('provider_reference');
            }
        });
    }
};

