<?php

namespace App\DTO;

use App\Models\UserSubscription;

final class UserSubscriptionsDTO
{
    public function __construct(
        public string $id,
        public string $name,
        public float $monthlyFee,
        public float $transactionFeePercent,
        public float $transactionFeeFixed,
        public int $includedTransactions,
        public int $currentPeriodTransactions,
        public float $currentPeriodVolume,
        public string $status,
    ) {}

    public static function fromModel(UserSubscription $userSubscription): self
    {
        return new self(
            id: $userSubscription->id,
            name: $userSubscription->subscription->name,
            monthlyFee: (float) $userSubscription->subscription->monthly_fee,
            transactionFeePercent: (float) $userSubscription->subscription->transaction_fee_percent,
            transactionFeeFixed: (float) $userSubscription->subscription->transaction_fee_fixed,
            includedTransactions: (int) $userSubscription->subscription->included_transactions,
            currentPeriodTransactions: (int) $userSubscription->current_period_transactions,
            currentPeriodVolume: (float) $userSubscription->current_period_volume,
            status: $userSubscription->status->label(),
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'monthly_fee' => $this->monthlyFee,
            'transaction_fee_percent' => $this->transactionFeePercent,
            'transaction_fee_fixed' => $this->transactionFeeFixed,
            'included_transactions' => $this->includedTransactions,
            'current_period_transactions' => $this->currentPeriodTransactions,
            'current_period_volume' => $this->currentPeriodVolume,
            'status' => $this->status,
        ];
    }
}
