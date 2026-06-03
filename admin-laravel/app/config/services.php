<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'payment_gateway' => [
        'internal_url' => env('PAYMENT_GATEWAY_INTERNAL_URL', 'http://gateway:80'),
        'public_url' => env('PAYMENT_GATEWAY_PUBLIC_URL', 'http://localhost:8080/api/v1/payments'),
    ],

    'gateway' => [
        'hmac_secret' => env('GATEWAY_HMAC_SECRET'),
    ],

    'static_site' => [
        'url' => env('STATIC_SITE_URL', 'http://localhost:8082'),
    ],

];
