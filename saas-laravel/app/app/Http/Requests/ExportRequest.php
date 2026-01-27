<?php

namespace App\Http\Requests;

use App\Enums\PaymentStatus;
use Illuminate\Foundation\Http\FormRequest;

class ExportRequest extends FormRequest
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
            'status' => $status
                ? PaymentStatus::fromString($status)->value
                : null,
        ]);
    }

    public function rules(): array
    {
        return [
            'merchant_id' => ['required', 'integer'],
            'order_id'    => ['nullable', 'integer'],
            'status'      => ['nullable'],
            'from'        => ['nullable', 'date'],
            'to'          => ['nullable', 'date'],
        ];
    }
}
