<?php

declare(strict_types=1);

namespace App\DTO;

use App\Models\Payment;
use App\Support\PaymentWorkflowFormatter;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

final readonly class PaymentsDTO
{
    /**
     * @param  array{label: string, provider_status: string, next_step: string}  $provider_summary
     * @param  array{request_started_at: string, last_provider_update_at: string, processing_duration: string, duration_seconds: int|null, state: string, state_label: string}  $timing
     * @param  list<array{timestamp: string, message: string, event_type: string, status: string, technical_response: array|string|null}>  $workflow_timeline
     */
    public function __construct(
        public string $id,
        public float $price,
        public float $amount,
        public string $merchant_id,
        public int|string $order_id,
        public string $status,
        public string $provider,
        public ?string $provider_status,
        public ?string $provider_reference,
        public ?string $provider_checkout_url,
        public CarbonInterface $created_at,
        public CarbonInterface $updated_at,
        public array $provider_summary,
        public array $timing,
        public array $workflow_timeline,
    ) {}

    /**
     * @param  Collection<int, \App\Models\PaymentLog>|null  $logs
     */
    public static function fromModel(Payment $payment, ?Collection $logs = null): self
    {
        $logs ??= collect();

        return new self(
            id: $payment->id,
            price: (float) $payment->price,
            amount: (float) $payment->amount,
            merchant_id: $payment->merchant_id,
            order_id: $payment->order_id,
            status: $payment->status->label(),
            provider: $payment->provider?->name ?? 'Unknown provider',
            provider_status: $payment->provider_status,
            provider_reference: $payment->provider_reference,
            provider_checkout_url: $payment->provider_checkout_url,
            created_at: $payment->created_at,
            updated_at: $payment->updated_at,
            provider_summary: PaymentWorkflowFormatter::summaryForPayment($payment, $logs),
            timing: PaymentWorkflowFormatter::timingForPayment($payment, $logs),
            workflow_timeline: PaymentWorkflowFormatter::timelineFromLogs($logs),
        );
    }

    /**
     * @return array{
     *     id: string,
     *     price: float,
     *     amount: float,
     *     merchant_id: string,
     *     order_id: int|string,
     *     status: string,
     *     provider: string,
     *     provider_status: string|null,
     *     provider_reference: string|null,
     *     provider_checkout_url: string|null,
     *     created_at: string,
     *     updated_at: string,
     *     provider_summary: array{label: string, provider_status: string, next_step: string},
     *     timing: array{request_started_at: string, last_provider_update_at: string, processing_duration: string, duration_seconds: int|null, state: string, state_label: string},
     *     workflow_timeline: list<array{timestamp: string, message: string, event_type: string, status: string, technical_response: array|string|null}>
     * }
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'price' => $this->price,
            'amount' => $this->amount,
            'merchant_id' => $this->merchant_id,
            'order_id' => $this->order_id,
            'status' => $this->status,
            'provider' => $this->provider,
            'provider_status' => $this->provider_status,
            'provider_reference' => $this->provider_reference,
            'provider_checkout_url' => $this->provider_checkout_url,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
            'provider_summary' => $this->provider_summary,
            'timing' => $this->timing,
            'workflow_timeline' => $this->workflow_timeline,
        ];
    }
}
