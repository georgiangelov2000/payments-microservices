<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Jobs\SendEmailNotificationJob;
use App\Mail\EmailNotificationMail;
use App\Models\EmailNotificationDelivery;
use App\Models\Payment;
use App\Models\User;
use App\Services\EmailNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

final class EmailNotificationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_merchant_settings_recipients_and_preferences_are_persisted(): void
    {
        $merchant = User::factory()->create();
        $service = app(EmailNotificationService::class);

        $service->updateMerchantSettings($merchant->id, [
            'enabled' => true,
            'environment_scope' => 'live',
            'pending_threshold_minutes' => 45,
            'minimum_amount' => 20,
            'recipients' => ['ops@example.com', 'finance@example.com'],
            'events' => ['payment.succeeded', 'payment.failed'],
        ]);

        $this->assertDatabaseHas('email_notification_settings', [
            'merchant_id' => $merchant->id,
            'enabled' => true,
            'environment_scope' => 'live',
            'pending_threshold_minutes' => 45,
        ]);
        $this->assertDatabaseHas('email_notification_recipients', [
            'merchant_id' => $merchant->id,
            'email' => 'ops@example.com',
        ]);
        $this->assertDatabaseHas('email_notification_event_preferences', [
            'merchant_id' => $merchant->id,
            'event_type' => 'payment.succeeded',
            'enabled' => true,
        ]);
        $this->assertDatabaseHas('email_notification_event_preferences', [
            'merchant_id' => $merchant->id,
            'event_type' => 'provider.timeout',
            'enabled' => false,
        ]);
    }

    public function test_recipient_email_validation_rejects_invalid_addresses(): void
    {
        $merchant = User::factory()->create();

        $response = $this->actingAs($merchant)->from('/notifications')->put('/notifications', [
            'enabled' => true,
            'environment_scope' => 'both',
            'pending_threshold_minutes' => 60,
            'minimum_amount' => null,
            'recipients' => ['not-an-email'],
            'events' => ['payment.succeeded'],
        ]);

        $response->assertRedirect('/notifications');
        $response->assertSessionHasErrors('recipients.0');
        $this->assertDatabaseCount('email_notification_recipients', 0);
    }

    public function test_disabled_event_preference_does_not_create_delivery(): void
    {
        Bus::fake();

        $merchant = User::factory()->create();
        $service = app(EmailNotificationService::class);
        $service->updateMerchantSettings($merchant->id, [
            'enabled' => true,
            'environment_scope' => 'both',
            'pending_threshold_minutes' => 60,
            'minimum_amount' => null,
            'recipients' => ['ops@example.com'],
            'events' => ['payment.failed'],
        ]);

        $payment = $this->payment($merchant, PaymentStatus::FINISHED);

        $this->assertSame(0, $service->queuePaymentEvent($payment, 'payment.succeeded'));
        $this->assertDatabaseCount('email_notification_deliveries', 0);
        Bus::assertNotDispatched(SendEmailNotificationJob::class);
    }

    public function test_delivery_creation_is_idempotent_per_event_payment_and_recipient(): void
    {
        Bus::fake();

        $merchant = User::factory()->create();
        $service = app(EmailNotificationService::class);
        $service->updateMerchantSettings($merchant->id, [
            'enabled' => true,
            'environment_scope' => 'both',
            'pending_threshold_minutes' => 60,
            'minimum_amount' => null,
            'recipients' => ['ops@example.com'],
            'events' => ['payment.succeeded'],
        ]);

        $payment = $this->payment($merchant, PaymentStatus::FINISHED);

        $this->assertSame(1, $service->queuePaymentEvent($payment, 'payment.succeeded'));
        $this->assertSame(0, $service->queuePaymentEvent($payment, 'payment.succeeded'));
        $this->assertDatabaseCount('email_notification_deliveries', 1);
        Bus::assertDispatched(SendEmailNotificationJob::class, 1);
        Bus::assertDispatched(SendEmailNotificationJob::class, function (SendEmailNotificationJob $job): bool {
            return $job->queue === 'notifications';
        });
    }

    public function test_send_job_records_successful_delivery(): void
    {
        Mail::fake();

        $merchant = User::factory()->create();
        $payment = $this->payment($merchant, PaymentStatus::FINISHED);
        $delivery = EmailNotificationDelivery::create([
            'merchant_id' => $merchant->id,
            'payment_id' => $payment->id,
            'order_id' => (string) $payment->order_id,
            'event_type' => 'payment.succeeded',
            'recipient_email' => 'ops@example.com',
            'status' => 'pending',
            'idempotency_key' => sha1('test-delivery'),
        ]);

        (new SendEmailNotificationJob($delivery->id))->handle(app(EmailNotificationService::class));

        $delivery->refresh();
        $this->assertSame('sent', $delivery->status);
        $this->assertSame(1, $delivery->attempts);
        $this->assertNotNull($delivery->sent_at);
        Mail::assertSent(EmailNotificationMail::class);
    }

    private function payment(User $merchant, PaymentStatus $status): Payment
    {
        return Payment::create([
            'merchant_id' => $merchant->id,
            'provider_id' => (string) Str::uuid(),
            'order_id' => random_int(100000, 999999),
            'price' => 49.99,
            'currency' => 'USD',
            'environment' => 'test',
            'routing_strategy' => 'priority',
            'status' => $status->value,
        ]);
    }
}
