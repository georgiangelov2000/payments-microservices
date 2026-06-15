<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\AdminExportFile;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class MerchantPaymentsExportFailedMail extends Mailable
{
    public function __construct(
        public readonly AdminExportFile $export,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Merchant payments export failed — '.strtoupper($this->export->format)
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.merchant-payments-export-failed',
            with: [
                'export' => $this->export,
                'failedAt' => $this->export->failed_at?->format('M j, Y g:i A'),
            ],
        );
    }
}
