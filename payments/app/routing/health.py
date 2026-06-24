import os
from datetime import datetime, timedelta, timezone
from typing import cast
from uuid import UUID

import redis.asyncio as redis
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.json_types import JsonValue
from app.models.payments import ProviderHealthStatus


class ProviderHealthMonitor:
    def __init__(self) -> None:
        self.failure_threshold = int(os.getenv("ROUTING_FAILURE_THRESHOLD", "3"))
        self.quarantine_seconds = int(os.getenv("ROUTING_PROVIDER_QUARANTINE_SECONDS", "300"))
        self.redis_url = os.getenv("REDIS_URL") or (
            f"redis://{os.getenv('REDIS_HOST', 'redis')}:{os.getenv('REDIS_PORT', '6379')}/0"
        )
        self._redis = redis.from_url(self.redis_url, decode_responses=True)

    def _key(self, merchant_id: UUID, environment: str, provider_alias: str) -> str:
        return f"routing:health:{merchant_id}:{environment}:{provider_alias.lower()}"

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    async def is_available(
        self, db: Session, merchant_id: UUID, environment: str, provider_alias: str
    ) -> bool:
        key = self._key(merchant_id, environment, provider_alias)
        if await self._redis.get(key) == "disabled":
            return False

        row = (
            db.query(ProviderHealthStatus)
            .filter(
                ProviderHealthStatus.merchant_id == merchant_id,
                ProviderHealthStatus.environment == environment,
                ProviderHealthStatus.provider_alias == provider_alias.lower(),
            )
            .first()
        )

        if not row:
            return True

        disabled_until = cast(datetime | None, row.disabled_until)
        if disabled_until and disabled_until > self._now():
            return False

        return cast(str, row.status) != "unhealthy"

    async def record_success(
        self,
        db: Session,
        merchant_id: UUID,
        provider_id: UUID | None,
        environment: str,
        provider_alias: str,
    ) -> None:
        await self._redis.delete(self._key(merchant_id, environment, provider_alias))
        self._upsert(
            db=db,
            merchant_id=merchant_id,
            provider_id=provider_id,
            environment=environment,
            provider_alias=provider_alias,
            values={
                "status": "healthy",
                "consecutive_failures": 0,
                "failure_rate": 0,
                "disabled_until": None,
                "last_success_at": self._now(),
                "last_checked_at": self._now(),
                "last_error": None,
            },
        )

    async def record_failure(
        self,
        db: Session,
        merchant_id: UUID,
        provider_id: UUID | None,
        environment: str,
        provider_alias: str,
        error: str,
        timed_out: bool = False,
    ) -> None:
        # SELECT FOR UPDATE locks the row so concurrent record_failure calls
        # cannot both read the same consecutive_failures value and undercount.
        row = (
            db.query(ProviderHealthStatus)
            .filter(
                ProviderHealthStatus.merchant_id == merchant_id,
                ProviderHealthStatus.environment == environment,
                ProviderHealthStatus.provider_alias == provider_alias.lower(),
            )
            .with_for_update()
            .first()
        )

        current_failures = cast(int, row.consecutive_failures) if row else 0
        current_timeout_count = cast(int, row.timeout_count) if row else 0
        next_failures = current_failures + 1
        disabled_until = None
        status = "degraded"

        if next_failures >= self.failure_threshold:
            status = "unhealthy"
            disabled_until = self._now() + timedelta(seconds=self.quarantine_seconds)
            await self._redis.setex(
                self._key(merchant_id, environment, provider_alias),
                self.quarantine_seconds,
                "disabled",
            )

        self._upsert(
            db=db,
            merchant_id=merchant_id,
            provider_id=provider_id,
            environment=environment,
            provider_alias=provider_alias,
            values={
                "status": status,
                "consecutive_failures": next_failures,
                "timeout_count": current_timeout_count + (1 if timed_out else 0),
                "failure_rate": 100,
                "disabled_until": disabled_until,
                "last_failure_at": self._now(),
                "last_checked_at": self._now(),
                "last_error": error[:4000],
            },
        )

    def _upsert(
        self,
        db: Session,
        merchant_id: UUID,
        provider_id: UUID | None,
        environment: str,
        provider_alias: str,
        values: dict[str, JsonValue | datetime],
    ) -> None:
        stmt = insert(ProviderHealthStatus).values(
            merchant_id=merchant_id,
            provider_id=provider_id,
            environment=environment,
            provider_alias=provider_alias.lower(),
            **values,
        )

        stmt = stmt.on_conflict_do_update(
            constraint="provider_health_scope_unique",
            set_={
                **values,
                "provider_id": provider_id,
                "updated_at": self._now(),
            },
        )

        db.execute(stmt)
