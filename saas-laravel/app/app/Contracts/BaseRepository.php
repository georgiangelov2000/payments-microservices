<?php

declare(strict_types=1);

namespace App\Contracts;

interface BaseRepository extends BaseDestroyRepositoryInterface, BaseIndexRepositoryInterface, BaseShowRepositoryInterface, BaseUpdateRepositoryInterface, BaseWriteRepositoryInterface {}
