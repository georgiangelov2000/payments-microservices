<?php

namespace App\Http\Requests;

use App\Enums\MerchantAPIKeyStatus;
use Illuminate\Foundation\Http\FormRequest;

class ApiKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    protected function prepareForValidation(): void
    {
        $status = $this->input('status');

        $this->merge([
            'merchant_id' => auth()->id(),
            'per_page'    => $this->input('per_page', 15),
            'status' => $status
                ? MerchantAPIKeyStatus::fromString($status)->value
                : null,            
        ]);
    }

    public function rules(): array
    {
        return [
            'merchant_id' => ['required', 'integer'],
            'per_page'    => ['integer', 'min:1', 'max:100'],
            'status'     => ['nullable']
        ];
    }
}
