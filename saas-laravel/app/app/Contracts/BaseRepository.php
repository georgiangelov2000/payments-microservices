<?php
declare(strict_types=1);

namespace App\Contracts;

interface BaseRepository extends BaseDestroyRepositoryInterface, BaseWriteRepositoryInterface, BaseShowRepositoryInterface,
    BaseUpdateRepositoryInterface, BaseIndexRepositoryInterface
{
}
