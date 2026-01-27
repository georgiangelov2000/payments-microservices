<?php

declare(strict_types=1);

namespace App\Contracts;

Interface BaseDestroyRepositoryInterface
{
    /**
     * @param int|string $id
     *
     * @return int
     */
    public function destroy(int|string $id): int;    
}
