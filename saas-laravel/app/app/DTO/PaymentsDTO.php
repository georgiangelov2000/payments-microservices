<?php

namespace App\DTO;

use App\Models\Payment;
use App\Support\PaymentWorkflowFormatter;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

final class PaymentsDTO
{
    public function __construct(
        public int $id,
        public float $price,
        public float $amount,
        public int $merchant_id,
        public int $order_id,
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
            provider: $payment->provider->name,
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
