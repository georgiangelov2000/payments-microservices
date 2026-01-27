<?php

declare(strict_types=1);

namespace App\Contracts;
use Illuminate\Database\Eloquent\Model;

interface BaseWriteRepositoryInterface
{
    /**
     * @param array $data
     *
     * @return null|Model
     */
    public function store(array $data): ?Model;
}
