<?php

declare(strict_types=1);

use Illuminate\Foundation\Console\ClosureCommand;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function (ClosureCommand $command) {
    $command->comment('Admin operations stay boring, visible, and controlled.');
})->purpose('Display a short line');

// Expire pending payments whose Stripe checkout window (24 h) has passed.
Schedule::command('payments:expire-stale-checkouts')->hourly()->withoutOverlapping();
