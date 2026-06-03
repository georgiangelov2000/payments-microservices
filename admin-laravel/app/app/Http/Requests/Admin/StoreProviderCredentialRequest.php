<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreProviderCredentialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'provider_id' => ['required', 'exists:providers,id'],
            'environment' => ['required', Rule::in(['test', 'live', 'sandbox', 'production'])],
            'display_name' => ['nullable', 'string', 'max:255'],
            'public_key' => ['nullable', 'string', 'max:1024'],
            'secret_value' => ['nullable', 'string', 'max:4096'],
            'status' => ['required', Rule::in(['pending', 'active', 'validated', 'disabled'])],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $provider = \App\Models\Provider::query()->find($this->input('provider_id'));
                $alias = $provider?->alias;
                $publicKey = (string) $this->input('public_key', '');
                $secret = (string) $this->input('secret_value', '');

                if ($alias === 'stripe') {
                    if ($publicKey !== '' && ! str_starts_with($publicKey, 'pk_')) {
                        $validator->errors()->add('public_key', 'Stripe publishable keys must start with pk_test_ or pk_live_.');
                    }

                    if ($secret !== '' && ! str_starts_with($secret, 'sk_')) {
                        $validator->errors()->add('secret_value', 'Stripe secret keys must start with sk_test_ or sk_live_.');
                    }
                }

                if ($alias === 'paypal') {
                    if ($publicKey !== '' && str_contains($publicKey, '@')) {
                        $validator->errors()->add('public_key', 'Use the PayPal client ID, not an email address.');
                    }

                    if ($secret !== '' && str_contains($secret, '@')) {
                        $validator->errors()->add('secret_value', 'Use the PayPal client secret, not an email address.');
                    }
                }
            },
        ];
    }
}
