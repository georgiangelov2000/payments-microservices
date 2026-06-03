<?php

declare(strict_types=1);

return [

    /*
     * Cross-Origin Resource Sharing (CORS)
     *
     * Paths that CORS headers apply to. The static-site auth endpoints need
     * explicit cross-origin credentials support so the browser will attach the
     * session cookie on fetch() calls from the marketing site origin.
     */

    'paths' => ['auth/*', 'api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Allow the static marketing site to make credentialed fetch() calls.
    // Must be an explicit origin (not '*') when supports_credentials is true.
    'allowed_origins' => [
        env('STATIC_SITE_URL', 'http://localhost:8082'),
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'Accept', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 0,

    // Required so the browser sends/receives the session cookie on cross-origin
    // requests from the static site.
    'supports_credentials' => true,

];
