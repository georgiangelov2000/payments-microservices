<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'merchant_id' => auth()->id(),
        ]);
    }

    public function rules(): array
    {
        return [
            'merchant_id' => ['required', 'uuid'],
            'order_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in(['pending', 'finished', 'failed'])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'format' => ['required', Rule::in(['csv', 'xlsx', 'json'])],
        ];
    }
}
