<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PaymentLogsApiController;

/*
|--------------------------------------------------------------------------
| Payments API
|--------------------------------------------------------------------------
*/

Route::middleware('api')
    ->prefix('v1')
    ->group(function () {

        /**
         * Payment logs (global)
         * GET /api/v1/payment-logs
         * GET /api/v1/payment-logs/{log}
         */
        Route::prefix('payment-logs')->group(function () {
            Route::get('/', [PaymentLogsApiController::class, 'index']);
            Route::get('{log}', [PaymentLogsApiController::class, 'show']);
            Route::get('payments/{paymentId}/logs',[PaymentLogsApiController::class, 'byPayment']);
        });
    });
