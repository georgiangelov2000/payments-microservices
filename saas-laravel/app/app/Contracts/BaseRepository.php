<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Contracts\Repositories\CreatesRecordsInterface;
use App\Contracts\Repositories\DestroysRecordsInterface;
use App\Contracts\Repositories\EditsRecordsInterface;
use App\Contracts\Repositories\ReadsRecordInterface;
use App\Contracts\Repositories\RetrievesRecordsInterface;

interface BaseRepository extends DestroysRecordsInterface, RetrievesRecordsInterface, ReadsRecordInterface, EditsRecordsInterface, CreatesRecordsInterface {}
