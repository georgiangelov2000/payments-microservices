<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Repositories\AnalyticsRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    public function __construct(private readonly AnalyticsRepository $analytics) {}

    public function index(Request $request): Response
    {
        $merchantId = Auth::id();
        $days = (int) $request->get('days', 30);
        $days = in_array($days, [7, 30, 90]) ? $days : 30;

        return Inertia::render('Analytics', [
            'days'               => $days,
            'overview'           => $this->analytics->getOverview($merchantId, $days),
            'dailyTrend'         => $this->analytics->getDailyTrend($merchantId, $days),
            'providerPerformance'=> $this->analytics->getProviderPerformance($merchantId, $days),
            'topDeclineCodes'    => $this->analytics->getTopDeclineCodes($merchantId, $days),
            'routingDistribution'=> $this->analytics->getRoutingDistribution($merchantId, $days),
            'latencyBuckets'     => $this->analytics->getLatencyBuckets($merchantId, $days),
        ]);
    }
}
