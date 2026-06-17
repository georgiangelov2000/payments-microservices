<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    private array $mainIndexes = [
        'sessions' => ['sessions_user_id_index'],
        'users' => ['ix_users_email', 'ix_users_status', 'ix_users_role'],
        'subscriptions' => ['ix_subscription_plans_name', 'ix_subscription_plans_code', 'ix_subscriptions_name', 'ix_subscriptions_code'],
        'merchant_api_keys' => ['ix_merchant_api_keys_status', 'ix_api_keys_hash', 'ix_api_keys_merchant_id', 'ix_merchant_api_keys_hash', 'ix_merchant_api_keys_merchant_id'],
        'providers' => ['ix_providers_alias', 'ix_providers_name'],
        'user_subscriptions' => ['ix_user_subscriptions_user_id', 'ix_user_subscriptions_subscription_id'],
        'gateway_access_profiles' => ['ix_gateway_access_profiles_hash', 'ix_gateway_access_profiles_merchant_id', 'ix_gateway_access_profiles_subscription_id', 'ix_gateway_access_fast_auth', 'ix_gateway_access_profiles_fast_auth'],
        'merchant_provider_credentials' => ['merchant_provider_credentials_merchant_id_index', 'merchant_provider_credentials_provider_id_index', 'merchant_provider_credentials_status_index'],
        'payments' => ['ix_payments_order_id', 'ix_payments_merchant_id', 'ix_payments_provider_id', 'ix_payments_provider_reference', 'ix_payments_status', 'ix_payments_merchant_status', 'ix_payments_created_at'],
    ];

    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        if ($this->columnType('users', 'id') === 'uuid') {
            return;
        }

        DB::transaction(function (): void {
            foreach ([
                'users',
                'subscriptions',
                'providers',
                'merchant_api_keys',
                'user_subscriptions',
                'gateway_access_profiles',
                'merchant_provider_credentials',
                'payments',
            ] as $table) {
                $this->addUuidColumn($table, 'uuid_id');
                $this->fillUuidIds($table);
            }

            $this->addUuidColumn('sessions', 'user_uuid');
            DB::statement('UPDATE sessions s SET user_uuid = u.uuid_id FROM users u WHERE s.user_id = u.id');

            $this->addUuidColumn('merchant_api_keys', 'merchant_uuid');
            DB::statement('UPDATE merchant_api_keys t SET merchant_uuid = u.uuid_id FROM users u WHERE t.merchant_id = u.id');

            $this->addUuidColumn('user_subscriptions', 'user_uuid');
            $this->addUuidColumn('user_subscriptions', 'subscription_uuid');
            DB::statement('UPDATE user_subscriptions t SET user_uuid = u.uuid_id FROM users u WHERE t.user_id = u.id');
            DB::statement('UPDATE user_subscriptions t SET subscription_uuid = s.uuid_id FROM subscriptions s WHERE t.subscription_id = s.id');

            $this->addUuidColumn('gateway_access_profiles', 'merchant_api_key_uuid');
            $this->addUuidColumn('gateway_access_profiles', 'merchant_uuid');
            $this->addUuidColumn('gateway_access_profiles', 'subscription_uuid');
            DB::statement('UPDATE gateway_access_profiles t SET merchant_api_key_uuid = k.uuid_id FROM merchant_api_keys k WHERE t.merchant_api_key_id = k.id');
            DB::statement('UPDATE gateway_access_profiles t SET merchant_uuid = u.uuid_id FROM users u WHERE t.merchant_id = u.id');
            DB::statement('UPDATE gateway_access_profiles t SET subscription_uuid = s.uuid_id FROM subscriptions s WHERE t.subscription_id = s.id');

            $this->addUuidColumn('merchant_provider_credentials', 'merchant_uuid');
            $this->addUuidColumn('merchant_provider_credentials', 'provider_uuid');
            DB::statement('UPDATE merchant_provider_credentials t SET merchant_uuid = u.uuid_id FROM users u WHERE t.merchant_id = u.id');
            DB::statement('UPDATE merchant_provider_credentials t SET provider_uuid = p.uuid_id FROM providers p WHERE t.provider_id = p.id');

            $this->addUuidColumn('payments', 'merchant_uuid');
            $this->addUuidColumn('payments', 'provider_uuid');
            DB::statement('UPDATE payments t SET merchant_uuid = u.uuid_id FROM users u WHERE t.merchant_id = u.id');
            DB::statement('UPDATE payments t SET provider_uuid = p.uuid_id FROM providers p WHERE t.provider_id = p.id');

            $paymentMap = DB::table('payments')->select('id', 'uuid_id')->get();

            foreach ($this->mainIndexes as $indexes) {
                foreach ($indexes as $index) {
                    DB::statement("DROP INDEX IF EXISTS {$index}");
                }
            }

            $this->swapNullableReference('sessions', 'user_id', 'user_uuid');
            $this->swapPrimaryKey('users');
            $this->swapPrimaryKey('subscriptions');
            $this->swapPrimaryKey('providers');
            $this->swapReference('merchant_api_keys', 'merchant_id', 'merchant_uuid');
            $this->swapPrimaryKey('merchant_api_keys');
            $this->swapReference('user_subscriptions', 'user_id', 'user_uuid');
            $this->swapReference('user_subscriptions', 'subscription_id', 'subscription_uuid');
            $this->swapPrimaryKey('user_subscriptions');
            $this->swapReference('gateway_access_profiles', 'merchant_api_key_id', 'merchant_api_key_uuid');
            $this->swapReference('gateway_access_profiles', 'merchant_id', 'merchant_uuid');
            $this->swapNullableReference('gateway_access_profiles', 'subscription_id', 'subscription_uuid');
            $this->swapPrimaryKey('gateway_access_profiles');
            $this->swapReference('merchant_provider_credentials', 'merchant_id', 'merchant_uuid');
            $this->swapReference('merchant_provider_credentials', 'provider_id', 'provider_uuid');
            $this->swapPrimaryKey('merchant_provider_credentials');
            $this->swapReference('payments', 'merchant_id', 'merchant_uuid');
            $this->swapReference('payments', 'provider_id', 'provider_uuid');
            $this->swapPrimaryKey('payments');
            $this->recreateMainIndexes();

            $this->convertLogs($paymentMap);
        });
    }

    public function down(): void
    {
        // Intentional one-way local conversion. Reversing UUIDs back to integers
        // would require keeping a permanent legacy ID map for every table.
    }

    private function convertLogs($paymentMap): void
    {
        $logs = DB::connection('pgsql_logs');

        if ($this->columnType('payment_logs', 'id', 'pgsql_logs') === 'uuid') {
            return;
        }

        foreach (['ix_payment_logs_payment_id', 'ix_payment_logs_event_type', 'ix_payment_logs_status', 'ix_payment_logs_created_at', 'ix_payment_logs_next_retry_at'] as $index) {
            $logs->statement("DROP INDEX IF EXISTS {$index}");
        }

        if (! Schema::connection('pgsql_logs')->hasColumn('payment_logs', 'uuid_id')) {
            Schema::connection('pgsql_logs')->table('payment_logs', fn ($table) => $table->uuid('uuid_id')->nullable());
        }

        if (! Schema::connection('pgsql_logs')->hasColumn('payment_logs', 'payment_uuid')) {
            Schema::connection('pgsql_logs')->table('payment_logs', fn ($table) => $table->uuid('payment_uuid')->nullable());
        }

        $logs->table('payment_logs')->whereNull('uuid_id')->orderBy('id')->select('id')->chunkById(100, function ($rows) use ($logs): void {
            foreach ($rows as $row) {
                $logs->table('payment_logs')->where('id', $row->id)->update(['uuid_id' => (string) Str::uuid7()]);
            }
        });

        foreach ($paymentMap as $payment) {
            $logs->table('payment_logs')
                ->where('payment_id', $payment->id)
                ->update(['payment_uuid' => $payment->uuid_id]);
        }

        $logs->table('payment_logs')->whereNull('payment_uuid')->orderBy('id')->select('id')->chunkById(100, function ($rows) use ($logs): void {
            foreach ($rows as $row) {
                $logs->table('payment_logs')->where('id', $row->id)->update(['payment_uuid' => (string) Str::uuid7()]);
            }
        });

        $logs->statement('ALTER TABLE payment_logs DROP CONSTRAINT IF EXISTS payment_logs_pkey');
        $logs->statement('ALTER TABLE payment_logs DROP COLUMN id');
        $logs->statement('ALTER TABLE payment_logs RENAME COLUMN uuid_id TO id');
        $logs->statement('ALTER TABLE payment_logs ALTER COLUMN id SET NOT NULL');
        $logs->statement('ALTER TABLE payment_logs ADD PRIMARY KEY (id)');
        $logs->statement('ALTER TABLE payment_logs DROP COLUMN payment_id');
        $logs->statement('ALTER TABLE payment_logs RENAME COLUMN payment_uuid TO payment_id');
        $logs->statement('ALTER TABLE payment_logs ALTER COLUMN payment_id SET NOT NULL');

        $logs->statement('CREATE INDEX ix_payment_logs_payment_id ON payment_logs(payment_id)');
        $logs->statement('CREATE INDEX ix_payment_logs_event_type ON payment_logs(event_type)');
        $logs->statement('CREATE INDEX ix_payment_logs_status ON payment_logs(status)');
        $logs->statement('CREATE INDEX ix_payment_logs_created_at ON payment_logs(created_at)');
        $logs->statement('CREATE INDEX ix_payment_logs_next_retry_at ON payment_logs(next_retry_at)');
    }

    private function addUuidColumn(string $table, string $column): void
    {
        if (! Schema::hasColumn($table, $column)) {
            Schema::table($table, fn ($schema) => $schema->uuid($column)->nullable());
        }
    }

    private function fillUuidIds(string $table): void
    {
        DB::table($table)->whereNull('uuid_id')->orderBy('id')->select('id')->chunkById(100, function ($rows) use ($table): void {
            foreach ($rows as $row) {
                DB::table($table)->where('id', $row->id)->update(['uuid_id' => (string) Str::uuid7()]);
            }
        });
    }

    private function swapPrimaryKey(string $table): void
    {
        DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$table}_pkey");
        DB::statement("ALTER TABLE {$table} DROP COLUMN id");
        DB::statement("ALTER TABLE {$table} RENAME COLUMN uuid_id TO id");
        DB::statement("ALTER TABLE {$table} ALTER COLUMN id SET NOT NULL");
        DB::statement("ALTER TABLE {$table} ADD PRIMARY KEY (id)");
    }

    private function swapReference(string $table, string $oldColumn, string $newColumn): void
    {
        DB::statement("ALTER TABLE {$table} DROP COLUMN {$oldColumn}");
        DB::statement("ALTER TABLE {$table} RENAME COLUMN {$newColumn} TO {$oldColumn}");
        DB::statement("ALTER TABLE {$table} ALTER COLUMN {$oldColumn} SET NOT NULL");
    }

    private function swapNullableReference(string $table, string $oldColumn, string $newColumn): void
    {
        DB::statement("ALTER TABLE {$table} DROP COLUMN {$oldColumn}");
        DB::statement("ALTER TABLE {$table} RENAME COLUMN {$newColumn} TO {$oldColumn}");
    }

    private function recreateMainIndexes(): void
    {
        DB::statement('CREATE INDEX sessions_user_id_index ON sessions(user_id)');
        DB::statement('CREATE INDEX ix_users_email ON users(email)');
        DB::statement('CREATE INDEX ix_users_status ON users(status)');
        DB::statement('CREATE INDEX ix_users_role ON users(role)');
        DB::statement('CREATE INDEX ix_subscription_plans_name ON subscriptions(name)');
        DB::statement('CREATE INDEX ix_subscription_plans_code ON subscriptions(code)');
        DB::statement('CREATE INDEX ix_merchant_api_keys_status ON merchant_api_keys(status)');
        DB::statement('CREATE INDEX ix_api_keys_hash ON merchant_api_keys(hash)');
        DB::statement('CREATE INDEX ix_api_keys_merchant_id ON merchant_api_keys(merchant_id)');
        DB::statement('CREATE INDEX ix_providers_alias ON providers(alias)');
        DB::statement('CREATE INDEX ix_providers_name ON providers(name)');
        DB::statement('CREATE INDEX ix_user_subscriptions_user_id ON user_subscriptions(user_id)');
        DB::statement('CREATE INDEX ix_user_subscriptions_subscription_id ON user_subscriptions(subscription_id)');
        DB::statement('CREATE UNIQUE INDEX uq_user_subscriptions_user_subscription ON user_subscriptions(user_id, subscription_id)');
        DB::statement('CREATE INDEX ix_gateway_access_profiles_merchant_id ON gateway_access_profiles(merchant_id)');
        DB::statement('CREATE INDEX ix_gateway_access_profiles_subscription_id ON gateway_access_profiles(subscription_id)');
        DB::statement('CREATE INDEX ix_gateway_access_fast_auth ON gateway_access_profiles(api_key_hash, api_key_status, merchant_status, subscription_status)');
        DB::statement('CREATE INDEX merchant_provider_credentials_merchant_id_index ON merchant_provider_credentials(merchant_id)');
        DB::statement('CREATE INDEX merchant_provider_credentials_provider_id_index ON merchant_provider_credentials(provider_id)');
        DB::statement('CREATE INDEX merchant_provider_credentials_status_index ON merchant_provider_credentials(status)');
        DB::statement('CREATE UNIQUE INDEX merchant_provider_credentials_unique ON merchant_provider_credentials(merchant_id, provider_id, environment)');
        DB::statement('CREATE INDEX ix_payments_order_id ON payments(order_id)');
        DB::statement('CREATE INDEX ix_payments_merchant_id ON payments(merchant_id)');
        DB::statement('CREATE INDEX ix_payments_provider_id ON payments(provider_id)');
        DB::statement('CREATE INDEX ix_payments_provider_reference ON payments(provider_reference)');
        DB::statement('CREATE INDEX ix_payments_status ON payments(status)');
        DB::statement('CREATE INDEX ix_payments_merchant_status ON payments(merchant_id, status)');
        DB::statement('CREATE INDEX ix_payments_created_at ON payments(created_at)');
    }

    private function columnType(string $table, string $column, ?string $connection = null): ?string
    {
        $query = DB::connection($connection)->selectOne(
            'select data_type from information_schema.columns where table_schema = current_schema() and table_name = ? and column_name = ?',
            [$table, $column],
        );

        return $query?->data_type;
    }
};
