<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\SubscriptionService;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class SubscriptionController extends Controller
{
    public function __construct(
        protected SubscriptionService $subscriptions
    ) {}

    public function index(Request $request)
    {
        $user = Auth::user();
        abort_if(!$user, 403);

        $merchantId = $user->id;
        $perPage = $request->integer('per_page', 15);

        $subscriptions = $this->subscriptions->getMerchantSubscriptions(
            merchantId: $merchantId,
            perPage: $perPage
        );

        return Inertia::render('Subscriptions/Index', [
            'subscriptions' => $subscriptions,
        ]);
    }
}
