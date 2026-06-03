<?php

declare(strict_types=1);

namespace App\Contracts;

use Illuminate\Database\Eloquent\Model;

interface BaseShowRepositoryInterface
{
    public function show(string $column, mixed $value, array $relationships = []): ?Model;
}
