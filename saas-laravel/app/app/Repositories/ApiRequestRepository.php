<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Builders\ApiRequestsBuilder;
use App\Contracts\ApiRequests\ApiRequestsRepositoryInterface;
use Illuminate\Database\Eloquent\Builder;

final readonly class ApiRequestRepository implements ApiRequestsRepositoryInterface
{
    /**
     * @param array $params
     *
     * @return Builder
     */
    public function fetchAll(array $params = []): Builder
    {
        $merchantId     = $params['merchant_id'] ?? null;
        $subscriptionId = $params['subscription_id'] ?? null;
        $paymentId      = $params['payment_id'] ?? null;
        $source         = $params['source'] ?? null;
        $from           = $params['from'] ?? null;
        $to             = $params['to'] ?? null;

        return (new ApiRequestsBuilder())
            ->forMerchant($merchantId)
            ->whereSubscription($subscriptionId)
            ->wherePayment($paymentId)
            ->whereSource($source)
            ->whereDateRange($from, $to)
            ->getQuery();
    }
}
