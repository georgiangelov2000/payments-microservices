<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class RoutingWorkflowResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'merchant_id' => $this->merchant_id,
            'merchant' => $this->merchant ? [
                'name' => $this->merchant->name,
                'email' => $this->merchant->email,
            ] : null,
            'name' => $this->name,
            'environment' => $this->environment,
            'status' => $this->status,
            'current_version' => $this->current_version,
            'nodes' => $this->nodes ?: [],
            'edges' => $this->edges ?: [],
            'validation_errors' => $this->validation_errors ?: [],
            'published_at' => $this->published_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
            'versions' => RoutingWorkflowVersionResource::collection($this->versions)->resolve($request),
        ];
    }
}
