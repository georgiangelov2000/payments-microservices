<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\Role;
use App\Enums\UserStatus;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard('admin')->user();

        if (! $user || $user->role !== Role::ADMIN || $user->status !== UserStatus::ACTIVE) {
            Auth::guard('admin')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            abort(403, __('messages.auth.admin_only'));
        }

        return $next($request);
    }
}
