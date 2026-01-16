<?php

namespace App\Http\Controllers;

use App\Services\ApiRequestService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;

class ApiRequestController extends Controller
{
    protected ApiRequestService $apiRequestService;

    public function __construct(ApiRequestService $apiRequestService)
    {
        $this->apiRequestService = $apiRequestService;
    }

    public function index(Request $request): Response
    {
        $user = Auth::user();

        abort_if(!$user, 403);

        $merchantId = $user->id;
        $perPage = $request->integer('per_page', 15);

        $apiRequests = $this->apiRequestService->getMerchantApiRequests(
            merchantId: $merchantId,
            perPage: $perPage
        );

        return Inertia::render('ApiRequests/Index', [
            'apiRequests' => $apiRequests,
        ]);
    }
}
