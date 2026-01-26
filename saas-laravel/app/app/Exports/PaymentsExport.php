<?php

namespace App\Exports;

use App\Models\Payment;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class PaymentsExport implements FromQuery, WithChunkReading, WithHeadings, WithMapping
{
    public function __construct(
        protected int $merchantId,
        protected array $filters = []
    ) {}

    /**
     * Query is streamed (NO memory load)
     */
    public function query(): Builder
    {
        return Payment::query()
            ->with('provider:id,name')
            ->where('merchant_id', $this->merchantId)
            ->when($this->filters['status'] ?? null, fn ($q, $status) =>
                $q->where('status', $status)
            )
            ->when($this->filters['from'] ?? null, fn ($q, $from) =>
                $q->whereDate('created_at', '>=', $from)
            )
            ->when($this->filters['to'] ?? null, fn ($q, $to) =>
                $q->whereDate('created_at', '<=', $to)
            )
            ->orderBy('id');
    }

    /**
     * Chunk size (memory safe)
     */
    public function chunkSize(): int
    {
        return 1000;
    }

    /**
     * CSV/XLSX headers
     */
    public function headings(): array
    {
        return [
            'ID',
            'Order ID',
            'Amount',
            'Status',
            'Provider',
            'Created At',
        ];
    }

    /**
     * Row mapping (1 row at a time)
     */
    public function map($payment): array
    {
        return [
            $payment->id,
            $payment->order_id,
            (float) $payment->price,
            $payment->status->value,
            $payment->provider?->name,
            $payment->created_at->toDateTimeString(),
        ];
    }
}
