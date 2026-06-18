<?php

declare(strict_types=1);

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Events\AfterSheet;

class MerchantPaymentsExport implements FromCollection, WithEvents, WithHeadings, WithMapping
{
    public function __construct(
        protected readonly array $rows,
        protected readonly array $range,
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
            'Paid Amount',
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
            $row['latest_order_id'] ?? '—',
            $row['latest_amount'] !== null && $row['latest_amount'] > 0 ? $row['latest_amount'] : ($row['payments_count'] > 0 ? 0 : '—'),
            $row['latest_currency'] ?? '—',
            $row['latest_provider'] ?? '—',
            $row['latest_status'] ?? '—',
            $row['latest_payment_at'] ?? '—',
        ];
    }

    public function registerEvents(): array
    {
        $range = $this->range;

        return [
            AfterSheet::class => function (AfterSheet $event) use ($range): void {
                $sheet = $event->sheet->getDelegate();

                // Insert 3 metadata rows at the top (data rows shift down automatically)
                $sheet->insertNewRowBefore(1, 3);

                $sheet->setCellValue('A1', 'Merchant Payments Export');
                $sheet->setCellValue('A2', 'Period: '.$range['label']);
                $sheet->setCellValue('A3', 'Date range: '.$range['from'].' to '.$range['to']);

                // Style the title
                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13);
                $sheet->getStyle('A2:A3')->getFont()->setItalic(true)->setSize(9);
                $sheet->getStyle('A2:A3')->getFont()->getColor()->setRGB('64748b');

                // Style the header row (now row 4)
                $sheet->getStyle('A4:P4')->getFont()->setBold(true);
                $sheet->getStyle('A4:P4')->getFill()
                    ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setRGB('f1f5f9');
            },
        ];
    }
}
