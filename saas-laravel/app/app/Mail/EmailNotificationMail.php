<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class EmailNotificationMail extends Mailable
{
    public string $subjectLine;

    public string $bodyText;

    public array $notification;

    public function __construct(
        string $subjectLine,
        string $bodyText,
        array $notification = []
    ) {
        $this->subjectLine = $subjectLine;
        $this->bodyText = $bodyText;
        $this->notification = $notification;
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.email-notification',
            text: 'emails.email-notification-text',
            with: [
                'bodyText' => $this->bodyText,
                'notification' => $this->notification,
            ],
        );
    }
}
