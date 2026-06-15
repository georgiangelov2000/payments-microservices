<?php

declare(strict_types=1);

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class MerchantPaymentsExport implements FromCollection, WithHeadings, WithMapping
{
    public function __construct(
        protected readonly array $rows,
    ) {}

    public function collection(): Collection
    {
        return collect($this->rows);
    }

    public function headings(): array
    {
        return [
            'Merchant',
            'Email',
            'Total Amount',
            'Currency',
            'Currency Count',
            'Payments',
            'Finished',
            'Pending',
            'Failed',
            'Refunded',
            'Latest Order ID',
            'Latest Amount',
            'Latest Currency',
            'Latest Provider',
            'Latest Status',
            'Latest Payment At',
        ];
    }

    public function map($row): array
    {
        return [
            $row['merchant_name'],
            $row['merchant_email'],
            $row['total_amount'],
            $row['currency'],
            $row['currencies_count'],
            $row['payments_count'],
            $row['finished_count'],
            $row['pending_count'],
            $row['failed_count'],
            $row['refunded_count'],
            $row['latest_order_id'],
            $row['latest_amount'],
            $row['latest_currency'],
            $row['latest_provider'],
            $row['latest_status'],
            $row['latest_payment_at'],
        ];
    }
}
