<?php

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
