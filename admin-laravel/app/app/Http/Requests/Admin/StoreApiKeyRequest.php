<?php
namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreApiKeyRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'merchant_id' => ['required', 'exists:users,id'],
            'name' => ['nullable', 'string', 'max:255'],
            'environment' => ['required', Rule::in(['test', 'live', 'sandbox', 'production'])],
            'scopes' => ['nullable', 'array'],
            'scopes.*' => ['string', Rule::in(['payments:create', 'payments:read', 'refunds:create', 'customers:read', 'routing:test', 'webhooks:manage'])],
        ];
    }
}
