<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboardService,
    ) {}

    public function __invoke(): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'metrics' => $this->dashboardService->getMetrics(),
            'recentPayments' => $this->dashboardService->getRecentPayments(),
        ]);
    }
}
