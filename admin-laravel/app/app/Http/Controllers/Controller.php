<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

abstract class Controller
{
    /**
     * @param  class-string<JsonResource>  $resourceClass
     * @return array<string, mixed>
     */
    protected function resolveResource(mixed $resource, string $resourceClass): array
    {
        return $resourceClass::make($resource)->resolve(request());
    }

    /**
     * @param  Collection<int, mixed>  $collection
     * @param  class-string<JsonResource>  $resourceClass
     * @return array<int, array<string, mixed>>
     */
    protected function resolveResourceCollection(Collection $collection, string $resourceClass): array
    {
        return $collection
            ->map(fn ($resource): array => $this->resolveResource($resource, $resourceClass))
            ->values()
            ->all();
    }

    /**
     * @param  class-string<JsonResource>  $resourceClass
     * @return array<string, mixed>
     */
    protected function resolveResourcePaginator(LengthAwarePaginator $paginator, string $resourceClass): array
    {
        $paginator->setCollection(
            $paginator->getCollection()->map(fn ($resource): array => $this->resolveResource($resource, $resourceClass))
        );

        return $paginator->toArray();
    }
}
