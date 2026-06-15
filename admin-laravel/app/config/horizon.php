<?php

declare(strict_types=1);

use Illuminate\Support\Str;

return [
    'name' => env('HORIZON_NAME'),
    'domain' => env('HORIZON_DOMAIN'),
    'path' => env('HORIZON_PATH', 'horizon'),
    'use' => 'default',
    'prefix' => env('HORIZON_PREFIX', Str::slug(env('APP_NAME', 'admin-laravel'), '_').'_horizon:'),
    'middleware' => ['web'],
    'waits' => [
        'redis:default' => 60,
        'redis:exports' => 300,
    ],
    'trim' => [
        'recent' => 60,
        'pending' => 60,
        'completed' => 60,
        'recent_failed' => 10080,
        'failed' => 10080,
        'monitored' => 10080,
    ],
    'silenced' => [],
    'silenced_tags' => [],
    'metrics' => [
        'trim_snapshots' => [
            'job' => 24,
            'queue' => 24,
        ],
    ],
    'fast_termination' => false,
    'memory_limit' => 64,
    'defaults' => [
        'supervisor-default' => [
            'connection' => 'redis',
            'queue' => ['default'],
            'balance' => 'auto',
            'autoScalingStrategy' => 'time',
            'processes' => 2,
            'memory' => 128,
            'tries' => 1,
            'timeout' => 60,
        ],
        'supervisor-exports' => [
            'connection' => 'redis',
            'queue' => ['exports'],
            'balance' => 'simple',
            'processes' => 1,
            'memory' => 256,
            'tries' => 3,
            'timeout' => 300,
        ],
    ],
    'environments' => [
        'production' => [
            'supervisor-exports' => [
                'connection' => 'redis',
                'queue' => ['exports'],
                'balance' => 'simple',
                'processes' => 2,
                'memory' => 256,
                'tries' => 3,
                'timeout' => 300,
            ],
        ],
        'local' => [
            'supervisor-exports' => [
                'connection' => 'redis',
                'queue' => ['exports'],
                'balance' => 'simple',
                'processes' => 1,
                'memory' => 256,
                'tries' => 3,
                'timeout' => 300,
            ],
        ],
    ],
];
