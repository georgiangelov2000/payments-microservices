<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use Illuminate\Database\Eloquent\Model;

interface FindsRecordsInterface
{
    public function find(string $id): Model;
}
