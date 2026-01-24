<?php

namespace App\DTO;

use App\Models\PaymentLog;

class PaymentLogsDTO
{
    public function __construct(
        public int $id,
        public int $payment_id,
        public int $event_type,
        public string $event_type_label,
        public int $status,
        public string $status_label,
        public ?string $message,
        public ?string $payload,
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
            created_at: $log->created_at
        );
    }

    /**
     * Convert DTO to array (API safe)
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

            'created_at' => $this->created_at,
        ];
    }
}
