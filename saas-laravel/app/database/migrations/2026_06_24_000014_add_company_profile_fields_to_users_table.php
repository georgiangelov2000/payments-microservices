<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('company_name')->nullable();
            $table->string('legal_name')->nullable();
            $table->string('logo_url', 2048)->nullable();
            $table->string('website', 2048)->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('tax_id', 100)->nullable();
            $table->string('country', 2)->nullable();
            $table->string('city')->nullable();
            $table->string('postal_code', 30)->nullable();
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'company_name',
                'legal_name',
                'logo_url',
                'website',
                'phone',
                'tax_id',
                'country',
                'city',
                'postal_code',
                'address_line1',
                'address_line2',
            ]);
        });
    }
};
