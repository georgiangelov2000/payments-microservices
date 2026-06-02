<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'           => ['required', 'string', 'max:255'],
            'email'          => ['required', 'email', 'max:255'],
            'company'        => ['required', 'string', 'max:255'],
            'job_title'      => ['nullable', 'string', 'max:255'],
            'monthly_volume' => ['nullable', 'string', 'max:100'],
            'message'        => ['nullable', 'string', 'max:2000'],
        ]);

        $to = config('mail.from.address', 'sales@payflow.io');

        Mail::raw(
            $this->formatBody($data),
            function ($message) use ($data, $to) {
                $message
                    ->to($to)
                    ->replyTo($data['email'], $data['name'])
                    ->subject("Sales inquiry from {$data['name']} – {$data['company']}");
            }
        );

        return response()->json(['message' => 'Thank you! We will be in touch shortly.']);
    }

    private function formatBody(array $data): string
    {
        return implode("\n", [
            "New sales inquiry from PayFlow.io",
            str_repeat('-', 40),
            "Name:           {$data['name']}",
            "Email:          {$data['email']}",
            "Company:        {$data['company']}",
            "Job title:      " . ($data['job_title'] ?? '—'),
            "Monthly volume: " . ($data['monthly_volume'] ?? '—'),
            "",
            "Message:",
            $data['message'] ?? '(none)',
        ]);
    }
}
