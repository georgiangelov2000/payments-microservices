<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

final class StoreMerchantPaymentsExportRequest extends IndexMerchantPaymentsRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'format' => ['required', 'string', 'in:xlsx,csv,json,pdf'],
        ]);
    }
}
