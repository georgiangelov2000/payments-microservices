<?php

declare(strict_types=1);

namespace Tests\Unit\Http\Resources;

use App\Http\Controllers\Controller;
use App\DTO\ApiKeysDTO;
use App\DTO\PaymentLogsDTO;
use App\DTO\PaymentsDTO;
use App\DTO\UserSubscriptionsDTO;
use App\Enums\MerchantAPIKeyStatus;
use App\Enums\PaymentLogEventType;
use App\Enums\PaymentLogStatus;
use App\Enums\PaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Http\Resources\ApiKeyResource;
use App\Http\Resources\PaymentLogResource;
use App\Http\Resources\PaymentResource;
use App\Http\Resources\UserSubscriptionResource;
use App\Models\MerchantApiKey;
use App\Models\Payment;
use App\Models\PaymentLog;
use App\Models\Provider;
use App\Models\Subscription;
use App\Models\UserSubscription;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Tests\TestCase;

final class SaasResourceSerializationTest extends TestCase
{
    public function test_resource_paginator_preserves_existing_paginator_response_shape(): void
    {
        $apiKey = new MerchantApiKey([
            'merchant_id' => 'merchant_1',
            'hash' => 'hash_value',
            'environment' => 'test',
            'status' => MerchantAPIKeyStatus::ACTIVE,
        ]);
        $apiKey->id = 'key_1';
        $apiKey->created_at = CarbonImmutable::parse('2026-06-02 11:00:00');

        $paginator = new LengthAwarePaginator(
            items: new Collection([$apiKey]),
            total: 1,
            perPage: 15,
            currentPage: 1,
            options: ['path' => '/api-keys']
        );

        $payload = $this->resolver()->paginator($paginator, ApiKeyResource::class);

        $this->assertSame(1, $payload['current_page']);
        $this->assertSame(1, $payload['from']);
        $this->assertSame(1, $payload['to']);
        $this->assertSame(1, $payload['total']);
        $this->assertIsArray($payload['links']);
        $this->assertSame(ApiKeysDTO::fromModel($apiKey)->toArray(), $payload['data'][0]);
    }

    public function test_payment_resource_matches_previous_dto_shape(): void
    {
        $logs = new Collection([
            $this->paymentLog('log_1', 'Payment created', '2026-06-01 10:00:05'),
            $this->paymentLog('log_2', 'Provider accepted', '2026-06-01 10:01:00'),
        ]);

        $payment = new Payment([
            'merchant_id' => 'merchant_1',
            'order_id' => 'ORD-1',
            'price' => '42.50',
            'status' => PaymentStatus::FINISHED,
            'provider_reference' => 'pi_123',
            'provider_checkout_url' => 'https://checkout.example.test',
            'currency' => null,
            'country' => 'US',
            'locale' => 'en',
            'channel' => 'web',
        ]);
        $payment->id = 'pay_1';
        $payment->created_at = CarbonImmutable::parse('2026-06-01 10:00:00');
        $payment->updated_at = CarbonImmutable::parse('2026-06-01 10:02:00');
        $payment->setRelation('provider', new Provider(['name' => 'Stripe', 'alias' => 'stripe']));
        $payment->setRelation('logs', $logs);

        $this->assertSame(
            PaymentsDTO::fromModel($payment, $logs)->toArray(),
            PaymentResource::make($payment)->resolve(Request::create('/'))
        );
    }

    public function test_api_key_subscription_and_payment_log_resources_match_previous_dtos(): void
    {
        $apiKey = new MerchantApiKey([
            'merchant_id' => 'merchant_1',
            'hash' => 'hash_value',
            'environment' => 'test',
            'status' => MerchantAPIKeyStatus::ACTIVE,
        ]);
        $apiKey->id = 'key_1';
        $apiKey->created_at = CarbonImmutable::parse('2026-06-02 11:00:00');

        $subscription = new Subscription([
            'name' => 'Pro',
            'monthly_fee' => '29.99',
            'transaction_fee_percent' => '1.50',
            'transaction_fee_fixed' => '0.30',
            'included_transactions' => 1000,
        ]);
        $subscription->id = 'plan_1';
        $userSubscription = new UserSubscription([
            'current_period_transactions' => 12,
            'current_period_volume' => '345.67',
            'status' => SubscriptionStatus::ACTIVE,
        ]);
        $userSubscription->id = 'user_sub_1';
        $userSubscription->setRelation('subscription', $subscription);

        $log = $this->paymentLog('log_1', 'Provider accepted', '2026-06-03 12:00:00');

        $this->assertSame(
            ApiKeysDTO::fromModel($apiKey)->toArray(),
            ApiKeyResource::make($apiKey)->resolve(Request::create('/'))
        );
        $this->assertSame(
            UserSubscriptionsDTO::fromModel($userSubscription)->toArray(),
            UserSubscriptionResource::make($userSubscription)->resolve(Request::create('/'))
        );
        $this->assertSame(
            PaymentLogsDTO::fromModel($log)->toArray(),
            PaymentLogResource::make($log)->resolve(Request::create('/'))
        );
    }

    private function paymentLog(string $id, string $message, string $createdAt): PaymentLog
    {
        $log = new PaymentLog([
            'payment_id' => 'pay_1',
            'event_type' => PaymentLogEventType::EVENT_PROVIDER_PAYMENT_ACCEPTED,
            'status' => PaymentLogStatus::SUCCESS,
            'message' => $message,
            'payload' => ['provider' => 'stripe'],
        ]);
        $log->id = $id;
        $log->created_at = CarbonImmutable::parse($createdAt);

        return $log;
    }

    private function resolver(): object
    {
        return new class extends Controller {
            /**
             * @param  class-string<\Illuminate\Http\Resources\Json\JsonResource>  $resourceClass
             * @return array<string, mixed>
             */
            public function paginator(LengthAwarePaginator $paginator, string $resourceClass): array
            {
                return $this->resolveResourcePaginator($paginator, $resourceClass);
            }
        };
    }
}
