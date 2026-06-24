<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validated();
        unset($data['logo'], $data['remove_logo']);

        if (isset($data['country'])) {
            $data['country'] = strtoupper($data['country']);
        }

        if ($request->boolean('remove_logo')) {
            $this->deleteLocalLogo($user->logo_url);
            $data['logo_url'] = null;
        }

        if ($request->hasFile('logo')) {
            $this->deleteLocalLogo($user->logo_url);
            $path = $request->file('logo')->store("merchant-logos/{$user->id}", 'public');
            $data['logo_url'] = Storage::disk('public')->url($path);
        }

        $user->fill($data);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        return Redirect::route('profile.edit');
    }

    private function deleteLocalLogo(?string $logoUrl): void
    {
        $path = parse_url((string) $logoUrl, PHP_URL_PATH);
        $prefix = '/storage/';

        if (is_string($path) && str_starts_with($path, $prefix)) {
            Storage::disk('public')->delete(substr($path, strlen($prefix)));
        }
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
