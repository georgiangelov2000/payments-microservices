<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoutingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'environment'              => ['required', Rule::in(['test', 'live'])],
            'enabled'                  => ['required', 'boolean'],
            'strategy'                 => ['required', Rule::in(['priority', 'weighted'])],
            'priority_chain'           => ['array'],
            'priority_chain.*'         => ['string'],
            'failover_chain'           => ['array'],
            'failover_chain.*'         => ['string'],
            'weighted_distribution'    => ['array'],
            'weighted_distribution.*'  => ['integer', 'min:0', 'max:100'],
        ];
    }
}
