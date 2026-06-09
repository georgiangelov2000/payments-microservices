<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class PaymentsExportReadyMail extends Mailable
{
    public function __construct(
        public readonly string $filename,
        public readonly string $format,
        public readonly string $absolutePath,
        public readonly array $filters = [],
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your payments export is ready — ' . strtoupper($this->format)
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.payments-export-ready',
            with: [
                'filename'   => $this->filename,
                'format'     => strtoupper($this->format),
                'filters'    => $this->filters,
                'exportedAt' => now()->format('M j, Y g:i A'),
            ]
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromPath($this->absolutePath)
                ->as($this->filename)
                ->withMime($this->mime()),
        ];
    }

    private function mime(): string
    {
        return match ($this->format) {
            'csv'  => 'text/csv',
            'json' => 'application/json',
            default => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
    }
}
