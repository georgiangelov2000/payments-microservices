<?php
namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProviderCredentialRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'provider_id' => ['required', 'exists:providers,id'],
            'environment' => ['required', Rule::in(['test', 'live', 'sandbox', 'production'])],
            'display_name' => ['nullable', 'string', 'max:255'],
            'public_key' => ['nullable', 'string', 'max:1024'],
            'secret_value' => ['nullable', 'string', 'max:4096'],
            'status' => ['required', Rule::in(['pending', 'active', 'validated', 'disabled'])],
        ];
    }
}
