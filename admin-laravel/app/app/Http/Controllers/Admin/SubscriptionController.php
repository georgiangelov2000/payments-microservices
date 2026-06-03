<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Subscriptions/Index', [
            'subscriptions' => Subscription::query()
                ->withCount('userSubscriptions')
                ->orderBy('name')
                ->paginate(15)
                ->through(fn (Subscription $subscription) => [
                    'id' => $subscription->id,
                    'name' => $subscription->name,
                    'code' => $subscription->code,
                    'monthly_fee' => (float) $subscription->monthly_fee,
                    'transaction_fee_percent' => (float) $subscription->transaction_fee_percent,
                    'transaction_fee_fixed' => (float) $subscription->transaction_fee_fixed,
                    'included_transactions' => $subscription->included_transactions,
                    'user_subscriptions_count' => $subscription->user_subscriptions_count,
                ]),
        ]);
    }
}
