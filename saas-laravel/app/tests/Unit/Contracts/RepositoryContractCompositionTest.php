<?php

declare(strict_types=1);

namespace Tests\Unit\Contracts;

use App\Contracts\ApiKeys\ApiKeyRepositoryInterface;
use App\Contracts\BaseRepository;
use App\Contracts\Payments\PaymentRepositoryInterface;
use App\Contracts\Repositories\CreatesRecordsInterface;
use App\Contracts\Repositories\DestroysRecordsInterface;
use App\Contracts\Repositories\EditsRecordsInterface;
use App\Contracts\Repositories\ReadsRecordInterface;
use App\Contracts\Repositories\RetrievesRecordsInterface;
use App\Contracts\Subscriptions\SubscriptionRepositoryInterface;
use PHPUnit\Framework\TestCase;

final class RepositoryContractCompositionTest extends TestCase
{
    public function test_saas_repository_interfaces_reuse_common_operation_contracts(): void
    {
        $this->assertContains(RetrievesRecordsInterface::class, class_implements(ApiKeyRepositoryInterface::class));
        $this->assertContains(RetrievesRecordsInterface::class, class_implements(PaymentRepositoryInterface::class));
        $this->assertContains(RetrievesRecordsInterface::class, class_implements(SubscriptionRepositoryInterface::class));
    }

    public function test_saas_base_repository_composes_all_common_operations(): void
    {
        $interfaces = class_implements(BaseRepository::class);

        $this->assertContains(RetrievesRecordsInterface::class, $interfaces);
        $this->assertContains(ReadsRecordInterface::class, $interfaces);
        $this->assertContains(CreatesRecordsInterface::class, $interfaces);
        $this->assertContains(EditsRecordsInterface::class, $interfaces);
        $this->assertContains(DestroysRecordsInterface::class, $interfaces);
    }
}
