<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\PaymentStatus;
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
        $environment = $request->get('env', 'test');
        $environment = in_array($environment, ['test', 'live']) ? $environment : 'test';
        $trendStatus = $request->get('trend_status');
        $trendStatus = in_array($trendStatus, array_map(fn (PaymentStatus $status) => $status->label(), PaymentStatus::cases()), true)
            ? $trendStatus
            : null;

        return Inertia::render('Analytics', [
            'days' => $days,
            'environment' => $environment,
            'overview' => $this->analytics->getOverview($merchantId, $days, $environment),
            'trendStatus' => $trendStatus,
            'dailyTrend' => $this->analytics->getDailyTrend($merchantId, $days, $environment, $trendStatus),
            'providerPerformance' => $this->analytics->getProviderPerformance($merchantId, $days, $environment),
        ]);
    }
}
