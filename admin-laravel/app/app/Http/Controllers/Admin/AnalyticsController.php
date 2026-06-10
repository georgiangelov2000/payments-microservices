<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Contracts\Analytics\AnalyticsRepositoryInterface;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class AnalyticsController extends Controller
{
    public function __construct(
        private readonly AnalyticsRepositoryInterface $analytics,
    ) {}

    public function index(Request $request): Response
    {
        $env = $request->query('environment', 'test');
        $env = in_array($env, ['test', 'live'], true) ? $env : 'test';

        return Inertia::render('Admin/Analytics/Index', [
            'environment'  => $env,
            'summary'      => $this->analytics->summary($env),
            'providers'    => $this->analytics->providerStats($env),
            'strategies'   => $this->analytics->strategyDistribution($env),
            'dailyTrend'   => $this->analytics->dailyFailovers($env, 30),
            'topErrors'    => $this->analytics->topErrors($env, 10),
        ]);
    }
}
