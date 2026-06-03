<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\MerchantApiKey;
use App\Services\GatewayAccessProfileService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Asynchronously syncs GatewayAccessProfile rows and their Redis cache entries.
 *
 * Using a queued job here ensures that model observers (fired from HTTP requests
 * or artisan commands) never block the calling process with expensive DB/Redis
 * writes, and that transient Redis failures are automatically retried.
 *
 * Dispatch types
 * ──────────────
 *  'sync_api_key'  — re-sync one API key by its primary key (fetched fresh inside the job)
 *  'invalidate_key'— remove one key from the Redis cache (hash passed directly, no DB read needed)
 *  'sync_merchant' — re-sync every API key that belongs to a merchant
 *  'sync_all'      — full re-sync of every API key in the system
 */
class SyncGatewayAccessProfileJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 5;

    /**
     * @param  string  $type  One of: sync_api_key | invalidate_key | sync_merchant | sync_all
     * @param  string|null  $merchantId  Required for 'sync_merchant'
     * @param  string|null  $apiKeyId  Primary-key of MerchantApiKey; required for 'sync_api_key'
     * @param  string|null  $apiKeyHash  Plain hash string; required for 'invalidate_key'
     */
    public function __construct(
        private readonly string $type,
        private readonly ?string $merchantId = null,
        private readonly ?string $apiKeyId = null,
        private readonly ?string $apiKeyHash = null,
    ) {}

    public function handle(GatewayAccessProfileService $service): void
    {
        match ($this->type) {
            'sync_api_key' => $this->handleSyncApiKey($service),
            'invalidate_key' => $service->invalidate($this->apiKeyHash),
            'sync_merchant' => $service->syncForMerchant($this->merchantId),
            'sync_all' => $service->syncAll(),
            default => null,
        };
    }

    private function handleSyncApiKey(GatewayAccessProfileService $service): void
    {
        $apiKey = MerchantApiKey::find($this->apiKeyId);

        if ($apiKey === null) {
            // The key was deleted between dispatch and execution; nothing to sync.
            return;
        }

        $service->syncApiKey($apiKey);
    }
}
