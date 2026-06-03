<?php

use App\Http\Controllers\Admin\ApiKeyController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\MerchantController;
use App\Http\Controllers\Admin\PaymentController;
use App\Http\Controllers\Admin\RoutingController;
use App\Http\Controllers\Admin\SubscriptionController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest:admin')->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])->name('admin.login.store');
});

Route::middleware(['auth:admin', 'admin'])->group(function () {
    Route::get('/', fn () => redirect()->route('admin.dashboard'));
    Route::get('/dashboard', DashboardController::class)->name('admin.dashboard');

    Route::get('/merchants', [MerchantController::class, 'index'])->name('admin.merchants.index');
    Route::get('/merchants/create', [MerchantController::class, 'create'])->name('admin.merchants.create');
    Route::post('/merchants', [MerchantController::class, 'store'])->name('admin.merchants.store');
    Route::get('/merchants/{merchant}/edit', [MerchantController::class, 'edit'])->name('admin.merchants.edit');
    Route::put('/merchants/{merchant}', [MerchantController::class, 'update'])->name('admin.merchants.update');
    Route::post('/merchants/{merchant}/providers', [MerchantController::class, 'storeProvider'])->name('admin.merchants.providers.store');
    Route::put('/merchant-provider-credentials/{credential}', [MerchantController::class, 'updateProvider'])->name('admin.merchant-provider-credentials.update');
    Route::get('/payments', [PaymentController::class, 'index'])->name('admin.payments.index');
    Route::get('/subscriptions', [SubscriptionController::class, 'index'])->name('admin.subscriptions.index');
    Route::get('/api-keys', [ApiKeyController::class, 'index'])->name('admin.api-keys.index');
    Route::post('/api-keys', [ApiKeyController::class, 'store'])->name('admin.api-keys.store');
    Route::put('/api-keys/{apiKey}', [ApiKeyController::class, 'update'])->name('admin.api-keys.update');
    Route::post('/api-keys/{apiKey}/rotate', [ApiKeyController::class, 'rotate'])->name('admin.api-keys.rotate');
    Route::post('/api-keys/{apiKey}/revoke', [ApiKeyController::class, 'revoke'])->name('admin.api-keys.revoke');
    Route::get('/routing', [RoutingController::class, 'index'])->name('admin.routing.index');
    Route::post('/routing/workflows', [RoutingController::class, 'storeWorkflow'])->name('admin.routing.workflows.store');
    Route::get('/routing/workflows/{workflow}/builder', [RoutingController::class, 'builder'])->name('admin.routing.workflows.builder');
    Route::put('/routing/workflows/{workflow}', [RoutingController::class, 'updateWorkflow'])->name('admin.routing.workflows.update');
    Route::post('/routing/workflows/{workflow}/publish', [RoutingController::class, 'publishWorkflow'])->name('admin.routing.workflows.publish');
    Route::post('/routing/workflows/{workflow}/rollback/{version}', [RoutingController::class, 'rollbackWorkflow'])->name('admin.routing.workflows.rollback');
    Route::post('/routing/workflows/{workflow}/simulate', [RoutingController::class, 'simulateWorkflow'])->name('admin.routing.workflows.simulate');

    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('admin.logout');
});
