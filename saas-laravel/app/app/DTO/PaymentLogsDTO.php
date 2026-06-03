<?php

declare(strict_types=1);

namespace App\DTO;

use App\Models\PaymentLog;
use App\Support\PaymentWorkflowFormatter;

final readonly class PaymentLogsDTO
{
    /**
     * @param  list<array{timestamp: string, message: string, event_type: string, status: string, technical_response: array|string|null}>  $workflow_events
     */
    public function __construct(
        public string $id,
        public string $payment_id,
        public int $event_type,
        public string $event_type_label,
        public int $status,
        public string $status_label,
        public ?string $message,
        public array|string|null $payload,
        public array $workflow_events,
        public string $created_at,
    ) {}

    /**
     * Build DTO from Eloquent model
     */
    public static function fromModel(PaymentLog $log): self
    {
        return new self(
            id: $log->id,
            payment_id: $log->payment_id,

            event_type: $log->event_type->value,
            event_type_label: $log->event_type->label(),

            status: $log->status->value,
            status_label: $log->status->label(),

            message: $log->message,
            payload: $log->payload,
            workflow_events: PaymentWorkflowFormatter::eventsFromLog($log),
            created_at: $log->created_at?->toISOString() ?? ''
        );
    }

    /**
     * Convert DTO to array (API safe)
     *
     * @return array{
     *     id: string,
     *     payment_id: string,
     *     event_type: int,
     *     event_type_label: string,
     *     status: int,
     *     status_label: string,
     *     message: string|null,
     *     payload: array|string|null,
     *     workflow_events: list<array{timestamp: string, message: string, event_type: string, status: string, technical_response: array|string|null}>,
     *     created_at: string
     * }
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'payment_id' => $this->payment_id,

            'event_type' => $this->event_type,
            'event_type_label' => $this->event_type_label,

            'status' => $this->status,
            'status_label' => $this->status_label,

            'message' => $this->message,
            'payload' => $this->payload,
            'workflow_events' => $this->workflow_events,

            'created_at' => $this->created_at,
        ];
    }
}
