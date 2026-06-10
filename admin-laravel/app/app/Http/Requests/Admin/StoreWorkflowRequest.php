<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWorkflowRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'merchant_id' => ['required', 'exists:users,id'],
            'name'        => ['required', 'string', 'max:255'],
            // Only 'test' and 'live' are valid merchant-facing environments.
            // The service enforces one workflow per (merchant_id, environment);
            // submitting for an existing pair updates it instead of duplicating.
            'environment' => ['required', Rule::in(['test', 'live'])],
            'nodes'       => ['nullable', 'array'],
            'edges'       => ['nullable', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'environment.in' => 'Environment must be either "test" or "live".',
        ];
    }
}
