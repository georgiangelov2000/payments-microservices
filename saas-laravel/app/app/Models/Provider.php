<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuidV7PrimaryKey;
use Illuminate\Database\Eloquent\Model;

class Provider extends Model
{
    use HasUuidV7PrimaryKey;

    protected $fillable = [
        'name',
        'alias',
        'url',
    ];
}
