<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\SubscriptionResource;
use App\Services\SubscriptionService;
use Inertia\Inertia;
use Inertia\Response;

final class SubscriptionController extends Controller
{
    public function __construct(
        private readonly SubscriptionService $subscriptions,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Admin/Subscriptions/Index', [
            'subscriptions' => $this->resolveResourcePaginator($this->subscriptions->paginate(), SubscriptionResource::class),
        ]);
    }
}
