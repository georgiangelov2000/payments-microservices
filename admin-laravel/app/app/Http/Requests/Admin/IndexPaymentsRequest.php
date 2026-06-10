<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

final class IndexPaymentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:pending,finished,failed'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
        ];
    }
}
