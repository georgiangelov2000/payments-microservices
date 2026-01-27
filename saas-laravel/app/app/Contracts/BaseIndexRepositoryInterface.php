<?php
declare(strict_types=1);

namespace App\Contracts;

use Illuminate\Database\Eloquent\Builder;

interface BaseIndexRepositoryInterface
{
    /**
     * @param array $params
     *
     * @return Builder
     */
    public function fetchAll(array $params): Builder;    
}
