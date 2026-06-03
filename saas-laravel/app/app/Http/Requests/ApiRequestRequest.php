<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApiRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'merchant_id' => $this->user()?->getAuthIdentifier(),
            'per_page' => $this->input('per_page', 15),
        ]);
    }

    public function rules(): array
    {
        return [
            'per_page' => ['integer', 'min:1', 'max:100'],
            'merchant_id' => ['nullable', 'uuid', 'exists:users,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'source' => ['nullable', 'string', 'max:100'],
        ];
    }
}
