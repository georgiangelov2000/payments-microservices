<?php

declare(strict_types=1);

namespace App\Exports;

use App\Builders\PaymentsBuilder;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class PaymentsExport implements FromQuery, WithChunkReading, WithHeadings, WithMapping
{
    public function __construct(
        protected string $merchantId,
        protected array $filters = []
    ) {}

    /**
     * Query is streamed (NO memory load)
     */
    public function query(): Builder
    {
        return (new PaymentsBuilder)
            ->forMerchant($this->merchantId)
            ->whereStatus($this->filters['status'] ?? null)
            ->whereOrder($this->filters['order_id'] ?? null)
            ->whereDateRange($this->filters['from'] ?? null, $this->filters['to'] ?? null)
            ->latest()
            ->getQuery();
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
            'Price',
            'Currency',
            'Channel',
            'Country',
            'Locale',
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
            $payment->currency,
            $payment->channel,
            $payment->country,
            $payment->locale,
            $payment->status->label(),
            $payment->provider?->name,
            $payment->created_at->toDateTimeString(),
        ];
    }
}
