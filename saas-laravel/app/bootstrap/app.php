<?php

declare(strict_types=1);

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
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
        //
    })
    ->create();
