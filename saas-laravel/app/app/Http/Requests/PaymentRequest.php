<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'merchant_id' => auth()->id(),
            'per_page'    => $this->input('per_page', 15),
        ]);
    }

    public function rules(): array
    {
        return [
            'merchant_id' => ['required', 'integer'],
            'per_page'    => ['integer', 'min:1', 'max:100'],
            'id'          => ['nullable', 'integer'],
            'status'      => ['nullable', 'string'],
            'from'        => ['nullable', 'date'],
            'to'          => ['nullable', 'date'],
        ];
    }
}
