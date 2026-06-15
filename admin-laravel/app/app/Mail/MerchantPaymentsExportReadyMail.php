<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\AdminExportFile;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Facades\Storage;

class MerchantPaymentsExportReadyMail extends Mailable
{
    public function __construct(
        public readonly AdminExportFile $export,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Merchant payments export is ready — '.strtoupper($this->export->format)
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.merchant-payments-export-ready',
            with: [
                'export' => $this->export,
                'downloadUrl' => route('admin.payments.merchants.exports.download', $this->export),
                'exportedAt' => $this->export->completed_at?->format('M j, Y g:i A'),
            ],
        );
    }

    public function attachments(): array
    {
        if (! $this->export->path || ! Storage::exists($this->export->path)) {
            return [];
        }

        return [
            Attachment::fromPath(Storage::path($this->export->path))
                ->as($this->export->filename ?? 'merchant-payments-export.'.$this->export->format)
                ->withMime($this->export->mime ?? 'application/octet-stream'),
        ];
    }
}
