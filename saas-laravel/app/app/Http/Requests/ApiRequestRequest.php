<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApiRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'user_id'     => auth()->id(),
            'per_page'    => $this->input('per_page', 15),
        ]);
    }

    public function rules(): array
    {
        return [
            'per_page'    => ['integer', 'min:1', 'max:100'],
            'user_id'     => ['nullable', 'integer', 'exists:users,id'],
            'from'        => ['nullable', 'date'],
            'to'          => ['nullable', 'date'],
            'source'      => ['nullable', 'string', 'max:100'],
        ];
    }
}
