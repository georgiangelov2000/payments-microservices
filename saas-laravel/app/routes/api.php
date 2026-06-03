<?php

declare(strict_types=1);

use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\PaymentLogsApiController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Payments API
|--------------------------------------------------------------------------
*/

/* Public — no auth required */
Route::middleware('api')->post('/contact', [ContactController::class, 'store'])
    ->middleware('throttle:5,60');

Route::middleware(['api', 'auth:sanctum'])
    ->prefix('v1')
    ->group(function () {

        /**
         * Payment logs — scoped to the authenticated merchant
         * GET /api/v1/payment-logs
         * GET /api/v1/payment-logs/{log}
         * GET /api/v1/payment-logs/payments/{paymentId}/logs
         */
        Route::prefix('payment-logs')->group(function () {
            Route::get('/', [PaymentLogsApiController::class, 'index']);
            Route::get('payments/{paymentId}/logs', [PaymentLogsApiController::class, 'byPayment']);
            Route::get('{log}', [PaymentLogsApiController::class, 'show']);
        });
    });
