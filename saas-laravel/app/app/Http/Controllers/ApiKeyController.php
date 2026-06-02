<?php
declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ApiKeyRequest;
use App\Services\ApiKeyService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

final class ApiKeyController extends Controller
{
    public function __construct(
        private readonly ApiKeyService $apiKeyService
    ) {}

    public function index(ApiKeyRequest $request): Response
    {
        $params = $request->safe()->toArray();
        
        return Inertia::render('ApiKeys/Index', [
            'keys' => $this->apiKeyService->fetchAll($params),
        ]);
    }

    public function store(): RedirectResponse
    {
        $plainTextKey = $this->apiKeyService->generateForMerchant(
            auth()->id()
        );

        return redirect()
            ->route('api-keys.index')
            ->with('generated_api_key', $plainTextKey);
    }
}
