<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

final class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $supported = array_keys(config('locales.supported', ['en' => 'English']));
        $locale = $request->session()->get('locale');

        if (! in_array($locale, $supported, true)) {
            $locale = $request->getPreferredLanguage($supported) ?: config('locales.fallback', 'en');
        }

        if (! in_array($locale, $supported, true)) {
            $locale = config('locales.fallback', 'en');
        }

        App::setLocale($locale);

        return $next($request);
    }
}
