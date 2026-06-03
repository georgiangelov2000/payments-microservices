<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateApiKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'scopes' => ['nullable', 'array'],
            'scopes.*' => ['string', Rule::in(['payments:create', 'payments:read', 'refunds:create', 'customers:read', 'routing:test', 'webhooks:manage'])],
        ];
    }
}
