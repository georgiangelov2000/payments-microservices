<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class AdminExportFileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'format' => $this->format,
            'status' => $this->status,
            'filename' => $this->filename,
            'message' => $this->message,
            'size' => $this->size,
            'filters' => $this->filters,
            'created_at' => $this->created_at?->toDateTimeString(),
            'completed_at' => $this->completed_at?->toDateTimeString(),
            'failed_at' => $this->failed_at?->toDateTimeString(),
            'download_url' => $this->status === 'completed'
                ? route('admin.payments.merchants.exports.download', $this->resource)
                : null,
        ];
    }
}
