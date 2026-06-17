<?php

declare(strict_types=1);

namespace Tests\Unit\Contracts;

use App\Contracts\ApiKeys\ApiKeyRepositoryInterface;
use App\Contracts\Merchants\MerchantRepositoryInterface;
use App\Contracts\Repositories\CreatesRecordsInterface;
use App\Contracts\Repositories\FindsRecordsInterface;
use App\Contracts\Repositories\PaginatesRecordsInterface;
use PHPUnit\Framework\TestCase;

final class RepositoryContractCompositionTest extends TestCase
{
    public function test_admin_repository_interfaces_reuse_common_operation_contracts(): void
    {
        $this->assertContains(PaginatesRecordsInterface::class, class_implements(ApiKeyRepositoryInterface::class));
        $this->assertContains(FindsRecordsInterface::class, class_implements(ApiKeyRepositoryInterface::class));
        $this->assertContains(CreatesRecordsInterface::class, class_implements(ApiKeyRepositoryInterface::class));

        $this->assertContains(PaginatesRecordsInterface::class, class_implements(MerchantRepositoryInterface::class));
        $this->assertContains(FindsRecordsInterface::class, class_implements(MerchantRepositoryInterface::class));
        $this->assertContains(CreatesRecordsInterface::class, class_implements(MerchantRepositoryInterface::class));
    }
}
