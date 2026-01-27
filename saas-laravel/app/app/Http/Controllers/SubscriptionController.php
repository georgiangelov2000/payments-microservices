<?php
declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\UserSubscriptionRequest;
use App\Services\SubscriptionService;
use Inertia\Inertia;
use Inertia\Response;

final class SubscriptionController extends Controller
{
    public function __construct(
        private readonly SubscriptionService $subscriptionService
    ) {}

    public function index(UserSubscriptionRequest $request): Response
    {
        $params = $request->safe()->toArray();

        return Inertia::render('Subscriptions/Index', [
            'subscriptions' => $this->subscriptionService->fetchAll($params),
        ]);
    }
}
