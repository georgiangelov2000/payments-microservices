<?php

namespace Database\Seeders;

use App\Models\Provider;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

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
