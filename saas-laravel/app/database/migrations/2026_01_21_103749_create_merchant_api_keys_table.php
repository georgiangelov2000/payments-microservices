<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
    
        if(!Schema::hasTable('merchant_api_keys')) {
            Schema::create('merchant_api_keys', function (Blueprint $table) {
                $table->id();
                $table->string('hash',64)->unique();
                
                $table->unsignedBigInteger('merchant_id');

                $table->tinyInteger('status')
                        ->default(1)
                        ->comment('1 = active, 2 = inactive');
                
                $table->timestamps();

                $table->index("status", "ix_merchant_api_keys_status");
                $table->index("hash", "ix_api_keys_hash");
                $table->index("merchant_id", "ix_api_keys_merchant_id");
            });            
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('merchant_api_keys');
    }
};
