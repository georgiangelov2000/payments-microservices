<?php

namespace App\Exports;

use App\Builders\PaymentsBuilder;
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
        return (new PaymentsBuilder())
            ->forMerchant($this->merchantId)
            ->whereStatus($this->filters['status'])
            ->wheredDateRange($this->filters["from"], $this->filters["to"])
            ->latest();
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
            $payment->status->label(),
            $payment->provider?->name,
            $payment->created_at->toDateTimeString(),
        ];
    }
}
