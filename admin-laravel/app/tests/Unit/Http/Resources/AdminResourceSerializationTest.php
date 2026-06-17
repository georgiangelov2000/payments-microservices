<?php

declare(strict_types=1);

namespace Tests\Unit\Http\Resources;

use App\Enums\MerchantAPIKeyStatus;
use App\Enums\PaymentLogEventType;
use App\Enums\PaymentLogStatus;
use App\Enums\PaymentStatus;
use App\Enums\UserStatus;
use App\Http\Resources\Admin\AdminExportFileResource;
use App\Http\Resources\Admin\ApiKeyResource;
use App\Http\Resources\Admin\MerchantActivityResource;
use App\Http\Resources\Admin\MerchantResource;
use App\Http\Resources\Admin\PaymentResource;
use App\Http\Resources\Admin\RoutingWorkflowResource;
use App\Http\Resources\Admin\SubscriptionResource;
use App\Http\Controllers\Controller;
use App\Models\AdminExportFile;
use App\Models\MerchantApiKey;
use App\Models\MerchantProviderCredential;
use App\Models\Payment;
use App\Models\PaymentLog;
use App\Models\PaymentRoutingAttempt;
use App\Models\Provider;
use App\Models\RoutingWorkflow;
use App\Models\RoutingWorkflowVersion;
use App\Models\Subscription;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Tests\TestCase;

final class AdminResourceSerializationTest extends TestCase
{
    public function test_resource_paginator_preserves_laravel_paginator_shape_for_pages(): void
    {
        $subscription = new Subscription([
            'name' => 'Pro',
            'code' => 'pro',
            'monthly_fee' => '29.99',
            'transaction_fee_percent' => '1.50',
            'transaction_fee_fixed' => '0.30',
            'included_transactions' => 1000,
        ]);
        $subscription->id = 'sub_1';
        $subscription->user_subscriptions_count = 7;

        $paginator = new LengthAwarePaginator(
            items: new Collection([$subscription]),
            total: 1,
            perPage: 15,
            currentPage: 1,
            options: ['path' => '/admin/subscriptions']
        );

        $payload = $this->resolver()->paginator($paginator, SubscriptionResource::class);

        $this->assertArrayHasKey('data', $payload);
        $this->assertArrayHasKey('current_page', $payload);
        $this->assertArrayHasKey('first_page_url', $payload);
        $this->assertArrayHasKey('from', $payload);
        $this->assertSame(1, $payload['current_page']);
        $this->assertSame(1, $payload['from']);
        $this->assertSame(1, $payload['to']);
        $this->assertSame(1, $payload['total']);
        $this->assertIsArray($payload['links']);
        $this->assertSame('sub_1', $payload['data'][0]['id']);
        $this->assertSame(29.99, $payload['data'][0]['monthly_fee']);
    }

    public function test_payment_resource_preserves_legacy_service_shape(): void
    {
        $provider = new Provider(['name' => 'Stripe', 'alias' => 'stripe']);
        $merchant = new User(['name' => 'Merchant One', 'email' => 'merchant@example.test']);

        $payment = new Payment([
            'order_id' => 'ORD-1',
            'price' => '42.50',
            'status' => PaymentStatus::FINISHED,
            'currency' => 'USD',
            'country' => 'US',
            'locale' => 'en',
            'channel' => 'web',
        ]);
        $payment->id = 'pay_1';
        $payment->created_at = CarbonImmutable::parse('2026-06-01 10:00:00');
        $payment->updated_at = CarbonImmutable::parse('2026-06-01 10:02:00');
        $payment->setRelation('merchant', $merchant);
        $payment->setRelation('provider', $provider);
        $payment->setRelation('logs', new Collection([
            $this->paymentLog('log_1', 'Provider accepted', '2026-06-01 10:01:00'),
        ]));
        $payment->setRelation('routingAttempts', new Collection([
            new PaymentRoutingAttempt([
                'provider_alias' => 'stripe',
                'attempt_number' => 1,
                'status' => 'succeeded',
                'error_code' => null,
                'error_message' => null,
                'latency_ms' => 120,
            ]),
        ]));
        $payment->routingAttempts[0]->id = 'attempt_1';
        $payment->routingAttempts[0]->created_at = CarbonImmutable::parse('2026-06-01 10:00:05');

        $this->assertSame([
            'id' => 'pay_1',
            'order_id' => 'ORD-1',
            'price' => 42.5,
            'status' => 'finished',
            'currency' => 'USD',
            'country' => 'US',
            'locale' => 'en',
            'channel' => 'web',
            'merchant' => ['name' => 'Merchant One', 'email' => 'merchant@example.test'],
            'provider' => 'stripe',
            'created_at' => '2026-06-01 10:00:00',
            'timing' => [
                'request_started_at' => '2026-06-01 10:00:00',
                'last_provider_update_at' => '2026-06-01 10:01:00',
                'processing_duration' => '1m 0s',
                'duration_seconds' => 60,
                'state' => 'finished',
            ],
            'logs' => [[
                'id' => 'log_1',
                'event_type' => 'Provider status update',
                'status' => 'Successful',
                'message' => 'Provider accepted',
                'payload' => ['provider' => 'stripe'],
                'created_at' => '2026-06-01 10:01:00',
            ]],
            'routing_attempts' => [[
                'id' => 'attempt_1',
                'provider_alias' => 'stripe',
                'attempt_number' => 1,
                'status' => 'succeeded',
                'error_code' => null,
                'error_message' => null,
                'latency_ms' => 120,
                'created_at' => '2026-06-01 10:00:05',
            ]],
        ], PaymentResource::make($payment)->resolve(Request::create('/')));
    }

    public function test_admin_list_resources_preserve_legacy_shapes(): void
    {
        $merchant = new User([
            'name' => 'Merchant One',
            'email' => 'merchant@example.test',
            'status' => UserStatus::ACTIVE,
        ]);
        $merchant->id = 'merchant_1';
        $merchant->created_at = CarbonImmutable::parse('2026-06-01 10:00:00');
        $merchant->payments_count = 3;
        $merchant->api_keys_count = 2;
        $merchant->subscriptions_count = 1;

        $provider = new Provider(['id' => 'provider_1', 'name' => 'Stripe', 'alias' => 'stripe']);
        $credential = new MerchantProviderCredential([
            'provider_id' => 'provider_1',
            'environment' => 'test',
            'display_name' => 'Stripe Test',
            'public_key' => 'pk_test_abcdefghijklmnopqrstuvwxyz',
            'status' => 'active',
        ]);
        $credential->id = 'cred_1';
        $credential->last_validated_at = CarbonImmutable::parse('2026-06-02 11:00:00');
        $credential->setRelation('provider', $provider);

        $key = new MerchantApiKey([
            'name' => 'Test key',
            'key_prefix' => 'pk_test_abc',
            'hash' => 'hash_value',
            'environment' => 'test',
            'status' => MerchantAPIKeyStatus::ACTIVE,
            'scopes' => ['payments:create'],
        ]);
        $key->id = 'key_1';
        $key->last_rotated_at = CarbonImmutable::parse('2026-06-03 12:00:00');
        $key->revoked_at = null;

        $merchant->setRelation('providerCredentials', new Collection([$credential]));
        $merchant->setRelation('apiKeys', new Collection([$key]));

        $key->setRelation('merchant', new User(['name' => 'Merchant One', 'email' => 'merchant@example.test']));
        $key->created_at = CarbonImmutable::parse('2026-06-03 12:00:00');

        $subscription = new Subscription([
            'name' => 'Pro',
            'code' => 'pro',
            'monthly_fee' => '29.99',
            'transaction_fee_percent' => '1.50',
            'transaction_fee_fixed' => '0.30',
            'included_transactions' => 1000,
        ]);
        $subscription->id = 'sub_1';
        $subscription->user_subscriptions_count = 7;

        $this->assertSame('active', ApiKeyResource::make($key)->resolve(Request::create('/'))['status']);
        $this->assertSame('pk_test_abc...', ApiKeyResource::make($key)->resolve(Request::create('/'))['masked_key']);
        $this->assertSame('Stripe Test', MerchantResource::make($merchant)->resolve(Request::create('/'))['provider_credentials'][0]['display_name']);
        $this->assertSame(['payments:create'], MerchantResource::make($merchant)->resolve(Request::create('/'))['api_keys'][0]['scopes']);
        $this->assertSame(29.99, SubscriptionResource::make($subscription)->resolve(Request::create('/'))['monthly_fee']);
        $this->assertSame(7, SubscriptionResource::make($subscription)->resolve(Request::create('/'))['user_subscriptions_count']);
    }

    public function test_activity_export_status_and_routing_resources_preserve_shapes(): void
    {
        $latest = new Payment([
            'order_id' => 'ORD-1',
            'price' => '10.25',
            'currency' => null,
            'status' => PaymentStatus::PENDING,
        ]);
        $latest->id = 'pay_1';
        $latest->created_at = CarbonImmutable::parse('2026-06-04 09:00:00');
        $latest->setRelation('provider', new Provider(['alias' => 'stripe']));

        $merchant = new User(['id' => 'merchant_1', 'name' => 'Merchant One', 'email' => 'merchant@example.test']);
        $merchant->id = 'merchant_1';
        $merchant->payments_count = 5;
        $merchant->total_amount = '100.50';
        $merchant->currency = null;
        $merchant->currencies_count = 1;
        $merchant->paid_count = 2;
        $merchant->pending_count = 1;
        $merchant->failed_count = 1;
        $merchant->refunded_count = 1;
        $merchant->last_payment_at = '2026-06-04 09:00:00';
        $merchant->latest_payment = $latest;

        $export = new AdminExportFile([
            'format' => 'csv',
            'status' => 'queued',
            'filename' => null,
            'message' => 'Queued',
            'size' => null,
            'filters' => ['status' => 'pending'],
        ]);
        $export->id = 'export_1';
        $export->created_at = CarbonImmutable::parse('2026-06-04 10:00:00');

        $workflow = new RoutingWorkflow([
            'merchant_id' => 'merchant_1',
            'name' => 'Default',
            'environment' => 'test',
            'status' => 'draft',
            'current_version' => 2,
            'nodes' => null,
            'edges' => null,
            'validation_errors' => null,
        ]);
        $workflow->id = 'workflow_1';
        $workflow->updated_at = CarbonImmutable::parse('2026-06-05 11:00:00');
        $workflow->published_at = null;
        $workflow->setRelation('merchant', new User(['name' => 'Merchant One', 'email' => 'merchant@example.test']));
        $version = new RoutingWorkflowVersion(['id' => 'version_1', 'version' => 2, 'name' => 'Draft', 'status' => 'draft']);
        $version->id = 'version_1';
        $version->created_at = CarbonImmutable::parse('2026-06-05 10:00:00');
        $version->published_at = null;
        $workflow->setRelation('versions', new Collection([$version]));

        $this->assertSame('USD', MerchantActivityResource::make($merchant)->resolve(Request::create('/'))['currency']);
        $this->assertSame(10.25, MerchantActivityResource::make($merchant)->resolve(Request::create('/'))['latest_payment']['amount']);
        $this->assertNull(AdminExportFileResource::make($export)->resolve(Request::create('/'))['download_url']);
        $this->assertSame([], RoutingWorkflowResource::make($workflow)->resolve(Request::create('/'))['nodes']);
        $this->assertSame('Draft', RoutingWorkflowResource::make($workflow)->resolve(Request::create('/'))['versions'][0]['name']);
    }

    private function paymentLog(string $id, string $message, string $createdAt): PaymentLog
    {
        $log = new PaymentLog([
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
