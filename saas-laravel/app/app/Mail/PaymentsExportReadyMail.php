<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class PaymentsExportReadyMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $path
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your payments export is ready'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.payments-export-ready'
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromPath(
                Storage::disk('public')->path($this->path)
            )->as('payments-export.xlsx'),
        ];
    }
}
