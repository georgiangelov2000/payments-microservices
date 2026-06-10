<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered(): void
    {
        $response = $this->get('/login');

        $response->assertRedirect(config('services.static_site.url').'/login.html');
    }

    public function test_users_can_authenticate_using_the_login_screen(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertOk();
        $response->assertJsonPath('redirect', route('dashboard'));
    }

    public function test_session_endpoint_reports_authenticated_users(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/auth/session');

        $response->assertOk();
        $response->assertJsonPath('authenticated', true);
        $response->assertJsonPath('redirect', route('dashboard'));
    }

    public function test_session_endpoint_reports_guest_users(): void
    {
        $response = $this->getJson('/auth/session');

        $response->assertOk();
        $response->assertJsonPath('authenticated', false);
        $response->assertJsonPath('redirect', null);
    }

    public function test_users_can_not_authenticate_with_invalid_password(): void
    {
        $user = User::factory()->create();

        $this->postJson('/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_users_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $this->assertGuest();
        $response->assertRedirect('/');
    }
}
