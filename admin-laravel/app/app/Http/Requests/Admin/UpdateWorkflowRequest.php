<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWorkflowRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'environment' => ['required', Rule::in(['test', 'live', 'sandbox', 'production'])],
            'nodes' => ['required', 'array'],
            'edges' => ['nullable', 'array'],
        ];
    }
}
