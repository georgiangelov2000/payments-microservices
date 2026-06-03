<?php

declare(strict_types=1);

use Illuminate\Foundation\Console\ClosureCommand;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function (ClosureCommand $command) {
    $command->comment('Admin operations stay boring, visible, and controlled.');
})->purpose('Display a short line');
