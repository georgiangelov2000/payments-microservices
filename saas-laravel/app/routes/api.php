<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PaymentLogController;

/*
|--------------------------------------------------------------------------
| Payments API
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    /*
    |--------------------------------------------------
    | Payment Logs
    |--------------------------------------------------
    */

    // Get logs for a payment
    Route::get('/payments/{payment}/logs',[PaymentLogController::class, 'index']);

});
