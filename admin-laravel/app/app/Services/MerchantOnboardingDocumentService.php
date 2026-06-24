<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Dompdf\Dompdf;
use Dompdf\Options;

final class MerchantOnboardingDocumentService
{
    public function generate(User $merchant): string
    {
        $merchant->loadMissing(['apiKeys', 'providerCredentials.provider']);

        $html = view('merchants.onboarding-guide', [
            'merchant' => $merchant,
            'apiKeys' => $merchant->apiKeys->sortBy('environment')->values(),
            'providerCredentials' => $merchant->providerCredentials->sortBy('environment')->values(),
            'environments' => $this->environments(),
            'merchantPortalUrl' => rtrim((string) config('onboarding.merchant_portal_url'), '/'),
            'supportEmail' => (string) config('onboarding.support_email'),
            'supportUrl' => (string) config('onboarding.support_url'),
            'generatedAt' => now(),
        ])->render();

        $options = new Options();
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', false);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('a4');
        $dompdf->render();

        return $dompdf->output();
    }

    private function environments(): array
    {
        return [
            [
                'name' => __('messages.onboarding.environments.staging'),
                'key_environment' => 'test',
                'api_base_url' => rtrim((string) config('onboarding.staging_api_base_url'), '/'),
            ],
            [
                'name' => __('messages.onboarding.environments.production'),
                'key_environment' => 'live',
                'api_base_url' => rtrim((string) config('onboarding.production_api_base_url'), '/'),
            ],
        ];
    }
}
