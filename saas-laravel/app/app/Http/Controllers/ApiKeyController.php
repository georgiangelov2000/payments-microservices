<?php

namespace App\Http\Controllers;

use App\Services\ApiKeyService;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ApiKeyController extends Controller
{
    public function __construct(
        protected ApiKeyService $apiKeys
    ) {}

    public function index(): Response
    {
        $merchantId = Auth::id();

        $keys = $this->apiKeys->getMerchantApiKeys(
            merchantId: $merchantId,
            perPage: 10
        );

        return Inertia::render('ApiKeys/Index', [
            'keys' => $keys,
        ]);
    }
}
