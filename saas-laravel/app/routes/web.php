<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ApiKeyController;
use App\Http\Controllers\ApiRequestController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\ContactFormController;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Route;

Route::get('/', function (): RedirectResponse {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
});

Route::middleware('auth')->group(function () {

    /* Dashboard */
    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->name('dashboard');

    /* Profile */
    Route::prefix('profile')->name('profile.')->group(function () {
        Route::get('/', [ProfileController::class, 'edit'])->name('edit');
        Route::patch('/', [ProfileController::class, 'update'])->name('update');
        Route::delete('/', [ProfileController::class, 'destroy'])->name('destroy');
    });

    /* Payments */
    Route::prefix('payments')->name('payments.')->group(function () {
        Route::get('/', [PaymentController::class, 'index'])->name('index');
        Route::post('/exports', [PaymentController::class, 'export'])->name('export');
    });

    /* API Keys */
    Route::prefix('api-keys')->name('api-keys.')->group(function () {
        Route::get('/', [ApiKeyController::class, 'index'])->name('index');
        Route::post('/', [ApiKeyController::class, 'store'])->name('store');
    });

    /* Subscriptions */
    Route::prefix('subscriptions')->name('subscriptions.')->group(function () {
        Route::get('/', [SubscriptionController::class, 'index'])->name('index');
    });

    /* Contacts */
    Route::prefix('contacts')->name('contacts.')->group(function () {
        Route::get('/', [ContactFormController::class, 'index'])->name('index');
        Route::post('/', [ContactFormController::class, 'store'])->name('store');
    });

    /* API Requests */
    Route::prefix('api-requests')->name('api-requests.')->group(function () {
        Route::get('/', [ApiRequestController::class, 'index'])->name('index');
    });

});

require __DIR__.'/auth.php';
