<?php

declare(strict_types=1);

namespace App\Contracts;

use Illuminate\Database\Eloquent\Model;

interface BaseShowRepositoryInterface
{
    /**
     * @param string $column
     * @param mixed $value
     * @param array $relationships
     *
     * @return Model|null
     */
    public function show(string $column, mixed $value, array $relationships = []): ?Model;    
}
