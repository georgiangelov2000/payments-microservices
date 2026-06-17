<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class PaymentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'price' => (float) $this->price,
            'status' => $this->status?->label(),
            'currency' => $this->currency,
            'country' => $this->country,
            'locale' => $this->locale,
            'channel' => $this->channel,
            'merchant' => $this->merchant ? [
                'name' => $this->merchant->name,
                'email' => $this->merchant->email,
            ] : null,
            'provider' => $this->provider?->alias,
            'created_at' => $this->created_at?->toDateTimeString(),
            'timing' => $this->timingForPayment(),
            'logs' => PaymentLogResource::collection($this->logs)->resolve($request),
            'routing_attempts' => PaymentRoutingAttemptResource::collection($this->routingAttempts)->resolve($request),
        ];
    }

    /**
     * @return array{request_started_at: string, last_provider_update_at: string, processing_duration: string, duration_seconds: int|null, state: string}
     */
    private function timingForPayment(): array
    {
        $startedAt = $this->created_at;
        $lastLogAt = $this->logs
            ->pluck('created_at')
            ->filter()
            ->sortBy(fn (CarbonInterface $timestamp): int => $timestamp->getTimestamp())
            ->last();
        $lastProviderUpdate = $lastLogAt ?: $this->updated_at;
        $status = strtolower((string) ($this->status?->label() ?? ''));
        $endAt = $status === 'pending' ? now() : $lastProviderUpdate;
        $durationSeconds = $startedAt && $endAt
            ? (int) max(0, round($startedAt->diffInSeconds($endAt)))
            : null;

        return [
            'request_started_at' => $startedAt?->toDateTimeString() ?? '—',
            'last_provider_update_at' => $lastProviderUpdate?->toDateTimeString() ?? '—',
            'processing_duration' => $this->humanDuration($durationSeconds),
            'duration_seconds' => $durationSeconds,
            'state' => $status,
        ];
    }

    private function humanDuration(?int $seconds): string
    {
        if ($seconds === null) {
            return '—';
        }

        if ($seconds < 60) {
            return "{$seconds}s";
        }

        if ($seconds < 3600) {
            return intdiv($seconds, 60).'m '.($seconds % 60).'s';
        }

        if ($seconds < 86400) {
            return intdiv($seconds, 3600).'h '.intdiv($seconds % 3600, 60).'m';
        }

        return intdiv($seconds, 86400).'d '.intdiv($seconds % 86400, 3600).'h';
    }
}
