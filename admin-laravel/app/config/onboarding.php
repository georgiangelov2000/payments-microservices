<?php

declare(strict_types=1);

$paymentEndpoint = rtrim((string) env('PAYMENT_GATEWAY_PUBLIC_URL', 'http://localhost:8080/api/v1/payments'), '/');
$defaultApiBaseUrl = preg_replace('#/payments$#', '', $paymentEndpoint) ?: $paymentEndpoint;

return [
    'merchant_portal_url' => env('MERCHANT_PORTAL_URL', 'http://localhost'),
    'staging_api_base_url' => env('ONBOARDING_STAGING_API_BASE_URL', $defaultApiBaseUrl),
    'production_api_base_url' => env('ONBOARDING_PRODUCTION_API_BASE_URL', $defaultApiBaseUrl),
    'support_email' => env('ONBOARDING_SUPPORT_EMAIL', env('MAIL_FROM_ADDRESS', 'support@payflow.example')),
    'support_url' => env('ONBOARDING_SUPPORT_URL', ''),
];
