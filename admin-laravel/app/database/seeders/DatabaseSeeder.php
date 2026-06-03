<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Provider;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL', 'admin@example.com');
        $password = env('ADMIN_PASSWORD', 'admin-password');

        User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => env('ADMIN_NAME', 'PayFlow Admin'),
                'password' => Hash::make($password),
                'role' => Role::ADMIN->value,
                'status' => 1,
            ]
        );

        $this->seedPaymentProviders();
    }

    private function seedPaymentProviders(): void
    {
        foreach ($this->providers() as $provider) {
            Provider::query()->updateOrCreate(
                ['alias' => $provider['alias']],
                $provider
            );
        }
    }

    private function providers(): array
    {
        return [
            ['name' => 'Stripe', 'alias' => 'stripe', 'url' => 'https://stripe.com'],
            ['name' => 'PayPal', 'alias' => 'paypal', 'url' => 'https://paypal.com'],
        ];
    }
}
