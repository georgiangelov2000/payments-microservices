<?php
declare(strict_types=1);

namespace App\Contracts;

use Illuminate\Database\Eloquent\Model;

interface BaseUpdateRepositoryInterface
{
    /**
     * null is a special case when the model is not found. Maybe we should throw exception?
     *
     * @param int|string $id
     * @param array $data
     *
     * @return Model|null
     */
    public function update(int|string $id, array $data): Model|null;
}
