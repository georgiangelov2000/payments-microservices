<?php
declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ApiRequestRequest;
use App\Services\ApiRequestService;
use Inertia\Inertia;
use Inertia\Response;

final class ApiRequestController extends Controller
{
    public function __construct(
        private readonly ApiRequestService $apiRequestService
    ) {}

    public function index(ApiRequestRequest $request): Response
    {
        $params = $request->safe()->toArray();

        return Inertia::render('ApiRequests/Index', [
            'apiRequests' => $this->apiRequestService->fetchAll($params),
        ]);
    }
}
