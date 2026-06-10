<?php

declare(strict_types=1);

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\ApiKeyController;
use App\Http\Controllers\Auth\AuthApiController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\ContactFormController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RoutingController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

Route::post('/locale', [LocaleController::class, 'update'])->name('locale.update');

/*
 * Guest routes — login/register redirect to the static marketing site;
 * password-reset is handled here because it needs a server-rendered token.
 */
Route::middleware('guest')->group(function () {
    Route::get('login', fn () => redirect(config('services.static_site.url').'/login.html', 302))->name('login');
    Route::get('register', fn () => redirect(config('services.static_site.url').'/register.html', 302))->name('register');

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])->name('password.request');
    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])->name('password.email');
    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])->name('password.reset');
    Route::post('reset-password', [NewPasswordController::class, 'store'])->name('password.store');
});

/*
 * JSON authentication endpoints — POSTed by the static marketing site via fetch().
 * Exempt from CSRF (see bootstrap/app.php) to allow cross-origin requests with credentials.
 */
Route::prefix('auth')->group(function () {
    Route::get('/session', [AuthApiController::class, 'session'])->name('auth.api.session');
    Route::post('/login', [AuthApiController::class, 'login'])->name('auth.api.login');
    Route::post('/register', [AuthApiController::class, 'register'])->name('auth.api.register');
});

/*
 * Authenticated merchant routes.
 */
Route::middleware('auth')->group(function () {
    Route::get('/', fn () => redirect()->route('dashboard'));
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::prefix('profile')->name('profile.')->group(function () {
        Route::get('/', [ProfileController::class, 'edit'])->name('edit');
        Route::patch('/', [ProfileController::class, 'update'])->name('update');
        Route::delete('/', [ProfileController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('payments')->name('payments.')->group(function () {
        Route::get('/', [PaymentController::class, 'index'])->name('index');
        Route::get('/{id}', [PaymentController::class, 'show'])->name('show');
        Route::post('/exports', [PaymentController::class, 'export'])->name('export');
    });

    Route::prefix('api-keys')->name('api-keys.')->group(function () {
        Route::get('/', [ApiKeyController::class, 'index'])->name('index');
        Route::post('/', [ApiKeyController::class, 'store'])->name('store');
        Route::delete('/{id}', [ApiKeyController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('subscriptions')->name('subscriptions.')->group(function () {
        Route::get('/', [SubscriptionController::class, 'index'])->name('index');
    });

    Route::prefix('contacts')->name('contacts.')->group(function () {
        Route::get('/', [ContactFormController::class, 'index'])->name('index');
        Route::post('/', [ContactFormController::class, 'store'])->name('store');
    });

    Route::get('/analytics', [AnalyticsController::class, 'index'])->name('analytics');

    Route::prefix('routing')->name('routing.')->group(function () {
        Route::get('/', [RoutingController::class, 'index'])->name('index');
        Route::get('/workflows/{workflow}/builder', [RoutingController::class, 'builder'])->name('workflows.builder');
        Route::put('/workflows/{workflow}/canvas-layout', [RoutingController::class, 'saveCanvasLayout'])->name('workflows.canvas-layout');
    });

    Route::prefix('webhooks')->name('webhooks.')->group(function () {
        Route::get('/', [WebhookController::class, 'index'])->name('index');
        Route::get('/logs', [WebhookController::class, 'logs'])->name('logs');
        Route::post('/', [WebhookController::class, 'store'])->name('store');
        Route::delete('/{webhook}', [WebhookController::class, 'destroy'])->name('destroy');
        Route::post('/{webhook}/test', [WebhookController::class, 'test'])->name('test');
    });

    // Password management
    Route::put('password', [PasswordController::class, 'update'])->name('password.update');

    // Email verification
    Route::get('verify-email', EmailVerificationPromptController::class)->name('verification.notice');
    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');
    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    // Password confirmation
    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])->name('password.confirm');
    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::post('logout', [AuthApiController::class, 'logout'])->name('logout');
});
