<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use Illuminate\Database\Eloquent\Model;

interface UpdatesRecordsInterface
{
    /**
     * Implement this only when a repository can safely accept any Eloquent model
     * for editing. Repositories with model-specific update signatures should keep
     * those signatures on their domain contract.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Model $record, array $data): Model;
}
