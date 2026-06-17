<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use Illuminate\Database\Eloquent\Model;

interface CreatesRecordsInterface
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Model;
}
