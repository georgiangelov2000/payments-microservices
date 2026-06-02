<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

trait HasUuidV7PrimaryKey
{
    public function initializeHasUuidV7PrimaryKey(): void
    {
        $this->keyType = 'string';
        $this->incrementing = false;
    }

    protected static function bootHasUuidV7PrimaryKey(): void
    {
        static::creating(function ($model): void {
            if (!$model->getKey()) {
                $model->{$model->getKeyName()} = (string) Str::uuid7();
            }
        });
    }
}
