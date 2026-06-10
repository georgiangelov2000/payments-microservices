<?php

declare(strict_types=1);

use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\SetLocale::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        // The JSON auth endpoints are POSTed from the static marketing site
        // (different origin). They manage their own session lifecycle so CSRF
        // verification is skipped; CORS + SameSite cookie policy provide the
        // equivalent protection for these endpoints.
        $middleware->validateCsrfTokens(except: [
            'auth/login',
            'auth/register',
        ]);

        // Any unauthenticated request that normally would go to /login is
        // instead sent to the static marketing site login page.
        $middleware->redirectGuestsTo(
            fn () => config('services.static_site.url').'/login.html'
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // A stale remember_me cookie with an integer user ID causes a UUID
        // type error when the guard tries to restore the user. Treat it as
        // unauthenticated: log out, clear cookies, and redirect to login.
        $exceptions->render(function (QueryException $e, Request $request) {
            if (str_contains($e->getMessage(), 'invalid input syntax for type uuid')) {
                Auth::logout();
                $loginUrl = config('services.static_site.url').'/login.html';

                if ($request->expectsJson()) {
                    return response()->json(['message' => __('messages.auth.unauthenticated')], 401);
                }

                return redirect($loginUrl)->withCookie(cookie()->forget('remember_web'));
            }
        });
    })
    ->create();
