<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoutingRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'environment'    => ['required', Rule::in(['test', 'live'])],
            'name'           => ['required', 'string', 'max:255'],
            'provider_alias' => ['required', 'string'],
            'priority'       => ['required', 'integer', 'min:1', 'max:1000'],
            'enabled'        => ['required', 'boolean'],
            'conditions'     => ['array'],
        ];
    }
}
