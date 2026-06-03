<?php
namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMerchantRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $merchant = $this->route('merchant');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($merchant->id)],
            'status' => ['sometimes', 'required', Rule::in(['pending', 'active', 'inactive', 'suspended'])],
        ];
    }
}
