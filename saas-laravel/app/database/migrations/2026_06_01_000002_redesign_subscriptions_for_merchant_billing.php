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
        Schema::table('subscriptions', function (Blueprint $table) {
            if (! Schema::hasColumn('subscriptions', 'code')) {
                $table->string('code', 50)->nullable()->after('name');
            }

            if (! Schema::hasColumn('subscriptions', 'monthly_fee')) {
                $table->decimal('monthly_fee', 10, 2)->default('0.00')->after('code');
            }

            if (! Schema::hasColumn('subscriptions', 'transaction_fee_percent')) {
                $table->decimal('transaction_fee_percent', 5, 2)->default('0.00')->after('monthly_fee');
            }

            if (! Schema::hasColumn('subscriptions', 'transaction_fee_fixed')) {
                $table->decimal('transaction_fee_fixed', 10, 2)->default('0.00')->after('transaction_fee_percent');
            }

            if (! Schema::hasColumn('subscriptions', 'included_transactions')) {
                $table->unsignedBigInteger('included_transactions')->default(0)->after('transaction_fee_fixed');
            }
        });

        Schema::table('user_subscriptions', function (Blueprint $table) {
            if (! Schema::hasColumn('user_subscriptions', 'current_period_transactions')) {
                $table->unsignedBigInteger('current_period_transactions')->default(0)->after('subscription_id');
            }

            if (! Schema::hasColumn('user_subscriptions', 'current_period_volume')) {
                $table->decimal('current_period_volume', 18, 2)->default('0.00')->after('current_period_transactions');
            }
        });

        if (Schema::hasColumn('subscriptions', 'price')) {
            DB::table('subscriptions')
                ->where('monthly_fee', '0.00')
                ->update(['monthly_fee' => DB::raw('price')]);

            Schema::table('subscriptions', function (Blueprint $table) {
                $table->dropColumn('price');
            });
        }

        if (Schema::hasColumn('subscriptions', 'tokens')) {
            Schema::table('subscriptions', function (Blueprint $table) {
                $table->dropColumn('tokens');
            });
        }

        if (Schema::hasColumn('user_subscriptions', 'used_tokens')) {
            Schema::table('user_subscriptions', function (Blueprint $table) {
                $table->dropColumn('used_tokens');
            });
        }
    }

    public function down(): void
    {
        Schema::table('user_subscriptions', function (Blueprint $table) {
            if (Schema::hasColumn('user_subscriptions', 'current_period_volume')) {
                $table->dropColumn('current_period_volume');
            }

            if (Schema::hasColumn('user_subscriptions', 'current_period_transactions')) {
                $table->dropColumn('current_period_transactions');
            }
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            foreach ([
                'included_transactions',
                'transaction_fee_fixed',
                'transaction_fee_percent',
                'monthly_fee',
                'code',
            ] as $column) {
                if (Schema::hasColumn('subscriptions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
