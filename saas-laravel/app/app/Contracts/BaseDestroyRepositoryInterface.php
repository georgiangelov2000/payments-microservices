<?php

declare(strict_types=1);

namespace App\Contracts;

interface BaseDestroyRepositoryInterface
{
    public function destroy(int|string $id): int;
}
