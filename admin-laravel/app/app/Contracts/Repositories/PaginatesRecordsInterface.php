<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use Illuminate\Pagination\LengthAwarePaginator;

interface PaginatesRecordsInterface
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator;
}
