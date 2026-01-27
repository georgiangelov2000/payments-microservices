<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Builders\PaymentsBuilder;
use App\Contracts\Payments\PaymentRepositoryInterface;
use Illuminate\Database\Eloquent\Builder;

final readonly class PaymentRepository implements PaymentRepositoryInterface
{

    /**
     * @param array $params
     *
     * @return Builder
     */
    public function fetchAll(array $params = []): Builder
    {
        $status = $params["status"] ?? null;
        $merchantId =$params["merchant_id"] ?? null;
        $from = $params["from"] ?? null;
        $to = $params["to"] ?? null;
        
        return (new PaymentsBuilder())
            ->forMerchant($merchantId)
            ->whereStatus($status)
            ->wheredDateRange($from, $to)
            ->getQuery();
    }

}
