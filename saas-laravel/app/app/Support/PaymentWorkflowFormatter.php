<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Support\Collection;

final class PaymentWorkflowFormatter
{
    /**
     * @param  iterable<int, object>  $logs
     * @return list<array{timestamp: string, message: string, event_type: string, status: string, technical_response: array|string|null}>
     */
    public static function timelineFromLogs(iterable $logs): array
    {
        $events = [];

        foreach ($logs as $log) {
            $events = array_merge($events, self::eventsFromLog($log));
        }

        usort($events, fn (array $a, array $b): int => strcmp($a['timestamp'] ?? '', $b['timestamp'] ?? ''));

        return $events;
    }

    /**
     * @return list<array{timestamp: string, message: string, event_type: string, status: string, technical_response: array|string|null}>
     */
    public static function eventsFromLog(object $log): array
    {
        $message = trim((string) ($log->message ?? ''));
        $fallbackTimestamp = self::formatTimestamp($log->created_at ?? null);
        $fallbackMessage = $log->event_type?->label() ?? 'Provider workflow event';
        $payload = self::decodePayload($log->payload ?? null);
        $events = self::splitTimestampedMessage($message, $fallbackTimestamp, $fallbackMessage);

        if ($events === []) {
            $events[] = [
                'timestamp' => $fallbackTimestamp,
                'message' => $fallbackMessage,
            ];
        }

        return array_map(function (array $event) use ($log, $payload): array {
            return [
                'timestamp' => $event['timestamp'],
                'message' => self::cleanMessage($event['message']),
                'event_type' => $log->event_type?->label() ?? 'Provider workflow event',
                'status' => $log->status?->label() ?? 'Processed',
                'technical_response' => $payload,
            ];
        }, $events);
    }

    /**
     * @param  Collection<int, object>  $logs
     * @return array{label: string, next_step: string}
     */
    public static function summaryForPayment(Payment $payment, Collection $logs): array
    {
        $provider = $payment->provider?->name ?? 'Provider';
        $latestPayload = self::latestReadablePayload($logs);
        $hasCheckoutUrl = filled($payment->provider_checkout_url);

        $summary = match ($payment->status->label()) {
            'finished'           => 'Payment approved',
            'failed'             => self::failureSummary($latestPayload),
            'cancelled'          => 'Customer cancelled checkout',
            'refunded'           => 'Payment refunded',
            'partially_refunded' => 'Payment partially refunded',
            'disputed'           => 'Payment disputed',
            'expired'            => 'Checkout session expired',
            default              => $hasCheckoutUrl
                ? "Redirect customer to {$provider}"
                : self::pendingSummary($latestPayload),
        };

        return [
            'label' => $summary,
            'next_step' => self::nextStep($payment->status->label(), $hasCheckoutUrl, $provider),
        ];
    }

    /**
     * @param  Collection<int, object>  $logs
     * @return array{request_started_at: string, last_provider_update_at: string, processing_duration: string, duration_seconds: int|null, state: string, state_label: string}
     */
    public static function timingForPayment(Payment $payment, Collection $logs): array
    {
        $startedAt = self::asCarbon($payment->created_at);
        $timeline = self::timelineFromLogs($logs);
        $lastEventAt = collect($timeline)
            ->map(fn (array $event): ?Carbon => self::asCarbon($event['timestamp'] ?? null))
            ->filter()
            ->sortBy(fn (Carbon $timestamp): int => $timestamp->getTimestamp())
            ->last();
        $lastProviderUpdate = $lastEventAt ?: self::asCarbon($payment->updated_at);
        $endAt = $payment->status->label() === 'pending' ? Carbon::now() : $lastProviderUpdate;
        $durationSeconds = $startedAt && $endAt ? (int) max(0, round($startedAt->diffInSeconds($endAt))) : null;

        return [
            'request_started_at' => self::formatTimestamp($startedAt),
            'last_provider_update_at' => self::formatTimestamp($lastProviderUpdate),
            'processing_duration' => self::humanDuration($durationSeconds),
            'duration_seconds' => $durationSeconds,
            'state' => $payment->status->label(),
            'state_label' => self::stateLabel($payment->status->label()),
        ];
    }

    /**
     * @return list<array{timestamp: string, message: string}>
     */
    private static function splitTimestampedMessage(string $message, string $fallbackTimestamp, string $fallbackMessage): array
    {
        if ($message === '') {
            return [];
        }

        preg_match_all('/\[([^\]]+)\]/', $message, $matches, PREG_OFFSET_CAPTURE);

        if ($matches[0] === []) {
            return [[
                'timestamp' => $fallbackTimestamp,
                'message' => $message ?: $fallbackMessage,
            ]];
        }

        $events = [];
        $count = count($matches[0]);

        for ($i = 0; $i < $count; $i++) {
            $timestamp = $matches[1][$i][0] ?: $fallbackTimestamp;
            $start = $matches[0][$i][1] + strlen($matches[0][$i][0]);
            $end = $i + 1 < $count ? $matches[0][$i + 1][1] : strlen($message);
            $line = trim(substr($message, $start, $end - $start));

            $events[] = [
                'timestamp' => $timestamp,
                'message' => $line !== '' ? $line : $fallbackMessage,
            ];
        }

        return $events;
    }

    private static function cleanMessage(?string $message): string
    {
        $message = trim((string) $message);
        $message = preg_replace('/\s+/', ' ', $message);

        if ($message === '') {
            return 'Provider response received without a readable summary';
        }

        // Translate legacy raw Python log strings stored in the DB into plain English.
        $simpleTranslations = [
            '/Provider return processed:\s*PAYMENT_CANCELLED/i'       => 'Customer cancelled the checkout session.',
            '/Provider return processed:\s*PAYMENT_FINISHED/i'        => 'Payment captured successfully by the provider.',
            '/Provider return processed:\s*PAYMENT_FAILED/i'          => 'Payment was declined by the provider.',
            '/Provider return processed:\s*PAYMENT_\w+/i'             => 'Payment status updated by provider.',
            '/Payment is pending and waiting for customer action\.?/i' => 'Customer redirect ready — awaiting payment at checkout.',
            '/Payment created with (\w+) routing/i'                   => 'Payment initiated with $1 routing strategy.',
        ];

        foreach ($simpleTranslations as $pattern => $replacement) {
            $translated = preg_replace($pattern, $replacement, $message);
            if ($translated !== $message) {
                return trim((string) $translated);
            }
        }

        // Provider checkout — capitalize provider name via callback.
        $translated = preg_replace_callback(
            '/Provider checkout request sent to (\w+) \(attempt (\d+)\)/i',
            fn ($m) => 'Checkout session created with ' . ucfirst(strtolower($m[1])) . ' (attempt ' . $m[2] . ').',
            $message
        );
        if ($translated !== $message) {
            return trim((string) $translated);
        }

        return $message;
    }

    private static function decodePayload(array|string|null $payload): array|string|null
    {
        if (is_array($payload)) {
            return $payload;
        }

        if (! filled($payload)) {
            return null;
        }

        $decoded = json_decode($payload, true);

        return json_last_error() === JSON_ERROR_NONE ? $decoded : $payload;
    }

    /**
     * @param  Collection<int, object>  $logs
     */
    private static function latestReadablePayload(Collection $logs): array|string|null
    {
        return $logs
            ->sortByDesc('created_at')
            ->map(fn (object $log): array|string|null => self::decodePayload($log->payload ?? null))
            ->first(fn ($payload) => filled($payload));
    }

    private static function failureSummary(array|string|null $payload): string
    {
        $reason = self::payloadValue($payload, ['failure_message', 'decline_code', 'reason', 'message', 'error_description']);

        if ($reason === 'customer_cancelled') {
            return 'Customer cancelled checkout';
        }

        if (filled($reason)) {
            return ucfirst(str_replace('_', ' ', (string) $reason));
        }

        return 'Payment failed';
    }

    private static function pendingSummary(array|string|null $payload): string
    {
        $message = self::payloadValue($payload, ['message']);

        if (filled($message)) {
            return 'Waiting for provider update: '.ucfirst(str_replace('_', ' ', (string) $message));
        }

        return 'Payment request sent successfully';
    }

    private static function nextStep(string $status, bool $hasCheckoutUrl, string $provider): string
    {
        return match ($status) {
            'finished'                        => 'No action required',
            'failed'                          => 'Review provider message and ask the customer to retry if needed',
            'cancelled'                       => 'No action required — payment was cancelled',
            'refunded', 'partially_refunded'  => 'Refund has been issued',
            'disputed'                        => 'Review and respond to the dispute',
            'expired'                         => 'Ask the customer to initiate a new payment',
            default                           => $hasCheckoutUrl
                ? "Customer must complete checkout on {$provider}"
                : 'Wait for the next provider response',
        };
    }

    /**
     * @param  list<string>  $keys
     */
    private static function payloadValue(array|string|null $payload, array $keys): mixed
    {
        if (is_string($payload)) {
            return null;
        }

        if (! is_array($payload)) {
            return null;
        }

        foreach ($keys as $key) {
            $value = self::findKey($payload, $key);
            if (filled($value)) {
                return $value;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private static function findKey(array $payload, string $key): mixed
    {
        foreach ($payload as $payloadKey => $value) {
            if ($payloadKey === $key) {
                return $value;
            }

            if (is_array($value)) {
                $nested = self::findKey($value, $key);
                if (filled($nested)) {
                    return $nested;
                }
            }
        }

        return null;
    }

    private static function asCarbon(mixed $value): ?Carbon
    {
        if (! $value) {
            return null;
        }

        try {
            return $value instanceof Carbon ? $value : Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    private static function formatTimestamp(mixed $value): string
    {
        $timestamp = self::asCarbon($value);

        return $timestamp?->toISOString() ?? Carbon::now()->toISOString();
    }

    private static function humanDuration(?int $seconds): string
    {
        if ($seconds === null) {
            return 'Not available';
        }

        if ($seconds < 1) {
            return 'under 1s';
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

    private static function stateLabel(string $status): string
    {
        return match ($status) {
            'finished'           => 'Completed',
            'failed'             => 'Failed',
            'cancelled'          => 'Cancelled',
            'processing'         => 'Processing',
            'refunded'           => 'Refunded',
            'partially_refunded' => 'Partially Refunded',
            'disputed'           => 'Disputed',
            'expired'            => 'Expired',
            default              => 'Pending provider response',
        };
    }
}
