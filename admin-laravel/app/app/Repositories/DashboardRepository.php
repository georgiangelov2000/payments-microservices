<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Dashboard\DashboardRepositoryInterface;
use App\Enums\MerchantAPIKeyStatus;
use App\Enums\PaymentStatus;
use App\Enums\Role;
use App\Models\MerchantApiKey;
use App\Models\Payment;
use App\Models\PaymentRoutingAttempt;
use App\Models\ProviderHealthStatus;
use App\Models\RoutingWorkflow;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class DashboardRepository implements DashboardRepositoryInterface
{
    public function getMetrics(): array
    {
        $paymentsByStatus = Payment::query()
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            'admins' => User::query()->where('role', Role::ADMIN->value)->count(),
            'merchants' => User::query()->where('role', Role::MERCHANT->value)->count(),
            'activeMerchants' => User::query()->where('role', Role::MERCHANT->value)->where('status', 1)->count(),
            'payments' => Payment::query()->count(),
            'paymentVolume' => (float) Payment::query()
                ->where('status', PaymentStatus::FINISHED->value)
                ->sum('price'),
            'pendingPayments' => (int) ($paymentsByStatus[PaymentStatus::PENDING->value] ?? 0),
            'finishedPayments' => (int) ($paymentsByStatus[PaymentStatus::FINISHED->value] ?? 0),
            'failedPayments' => (int) ($paymentsByStatus[PaymentStatus::FAILED->value] ?? 0),
            'activeApiKeys' => MerchantApiKey::query()->where('status', MerchantAPIKeyStatus::ACTIVE->value)->count(),
            'subscriptions' => Subscription::query()->count(),
            'routingWorkflows' => RoutingWorkflow::query()->count(),
            'publishedWorkflows' => RoutingWorkflow::query()->where('status', 'published')->count(),
            'unhealthyProviders' => ProviderHealthStatus::query()->where('status', 'unhealthy')->count(),
            'routingFailovers' => PaymentRoutingAttempt::query()->whereIn('status', ['failed', 'timeout'])->count(),
        ];
    }

    public function getRecentPayments(int $limit = 8): array
    {
        return Payment::query()
            ->with(['merchant:id,name,email', 'provider:id,name,alias'])
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (Payment $payment) => [
                'id' => $payment->id,
                'order_id' => $payment->order_id,
                'price' => (float) $payment->price,
                'currency' => $payment->currency,
                'channel' => $payment->channel,
                'status' => $payment->status?->label(),
                'merchant' => $payment->merchant?->name,
                'provider' => $payment->provider?->alias,
                'created_at' => $payment->created_at?->toDateTimeString(),
            ])
            ->all();
    }
}
