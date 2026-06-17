<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Repositories\AnalyticsRepository;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

final class AnalyticsRepositoryTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_overview_casts_string_average_latency_before_rounding(): void
    {
        Carbon::setTestNow('2026-06-17 12:00:00');

        $currentPaymentsQuery = Mockery::mock();
        $currentPaymentsQuery->shouldReceive('selectRaw')
            ->once()
            ->withAnyArgs()
            ->andReturnSelf();
        $currentPaymentsQuery->shouldReceive('where')
            ->times(3)
            ->withAnyArgs()
            ->andReturnSelf();
        $currentPaymentsQuery->shouldReceive('first')
            ->once()
            ->andReturn((object) [
                'total' => 3,
                'succeeded' => 2,
                'failed' => 1,
                'volume' => '42.50',
                'currency' => 'USD',
            ]);

        $latencyQuery = Mockery::mock();
        $latencyQuery->shouldReceive('where')
            ->times(3)
            ->withAnyArgs()
            ->andReturnSelf();
        $latencyQuery->shouldReceive('whereNotNull')
            ->once()
            ->with('latency_ms')
            ->andReturnSelf();
        $latencyQuery->shouldReceive('avg')
            ->once()
            ->with('latency_ms')
            ->andReturn('468.9');

        $previousPaymentsQuery = Mockery::mock();
        $previousPaymentsQuery->shouldReceive('selectRaw')
            ->once()
            ->withAnyArgs()
            ->andReturnSelf();
        $previousPaymentsQuery->shouldReceive('where')
            ->times(2)
            ->withAnyArgs()
            ->andReturnSelf();
        $previousPaymentsQuery->shouldReceive('whereBetween')
            ->once()
            ->withAnyArgs()
            ->andReturnSelf();
        $previousPaymentsQuery->shouldReceive('first')
            ->once()
            ->andReturn((object) [
                'total' => 0,
                'succeeded' => 0,
                'volume' => 0,
            ]);

        DB::shouldReceive('table')
            ->once()
            ->with('payments')
            ->andReturn($currentPaymentsQuery);
        DB::shouldReceive('table')
            ->once()
            ->with('payment_routing_attempts')
            ->andReturn($latencyQuery);
        DB::shouldReceive('table')
            ->once()
            ->with('payments')
            ->andReturn($previousPaymentsQuery);

        $overview = (new AnalyticsRepository())->getOverview(
            '019e8e03-f519-703a-a044-263f0ef819ee',
            30,
            'test',
        );

        $this->assertSame(469, $overview['avg_latency_ms']);
        $this->assertSame(3, $overview['total']);
        $this->assertSame(2, $overview['succeeded']);
        $this->assertSame(1, $overview['failed']);
        $this->assertSame(66.7, $overview['success_rate']);
    }
}
