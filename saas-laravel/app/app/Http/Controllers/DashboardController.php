<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        protected DashboardService $dashboard
    ) {}

    public function index(): Response
    {
        $merchantId = Auth::id();

        $summary = $this->dashboard->getSummary($merchantId);

        return Inertia::render('Dashboard', [
            'summary' => $summary,
        ]);
    }
}
