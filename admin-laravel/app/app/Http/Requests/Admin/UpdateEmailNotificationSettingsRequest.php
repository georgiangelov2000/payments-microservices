<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Services\AdminEmailNotificationService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmailNotificationSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'max_recipients' => ['required', 'integer', 'min:1', 'max:20'],
            'retry_attempts' => ['required', 'integer', 'min:1', 'max:10'],
            'default_events' => ['array'],
            'default_events.*' => ['string', Rule::in(array_keys(AdminEmailNotificationService::EVENTS))],
        ];
    }
}
