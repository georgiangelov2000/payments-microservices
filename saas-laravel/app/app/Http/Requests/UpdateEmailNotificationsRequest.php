<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Services\EmailNotificationService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmailNotificationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'environment_scope' => ['required', Rule::in(['test', 'live', 'both'])],
            'pending_threshold_minutes' => ['required', 'integer', 'min:1', 'max:10080'],
            'minimum_amount' => ['nullable', 'numeric', 'min:0'],
            'recipients' => ['array', 'max:20'],
            'recipients.*' => ['required', 'email:rfc,dns', 'distinct:ignore_case', 'max:255'],
            'events' => ['array'],
            'events.*' => ['string', Rule::in(array_keys(EmailNotificationService::EVENTS))],
        ];
    }
}
