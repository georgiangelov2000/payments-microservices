<?php
namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWorkflowRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'merchant_id' => ['required', 'exists:users,id'],
            'name' => ['required', 'string', 'max:255'],
            'environment' => ['required', Rule::in(['test', 'live', 'sandbox', 'production'])],
            'nodes' => ['nullable', 'array'],
            'edges' => ['nullable', 'array'],
        ];
    }
}
