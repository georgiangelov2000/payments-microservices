"""
Provider simulation service.

In test mode only, merchants can configure artificial failure behaviors per
provider so they can verify that failover, health monitoring, and retry logic
work correctly without touching a real payment provider.

Configuration is stored in provider_routing_configurations.metadata_json as:

    {
        "provider_behaviors": {
            "stripe": { "mode": "force_fail" },
            "paypal": { "mode": "random_fail", "fail_rate": 30 }
        }
    }

Modes:
    "off"         — normal behaviour (default)
    "force_fail"  — always fail with a 502
    "force_timeout" — always raise TimeoutException
    "random_fail" — fail with probability = fail_rate / 100
"""

import json
import random
from uuid import UUID

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.payments import ProviderRoutingConfiguration


class ProviderSimulationService:
    def check(
        self,
        db: Session,
        merchant_id: UUID,
        environment: str,
        provider_alias: str,
    ) -> None:
        """
        Raises HTTPException or httpx.TimeoutException if the test-mode config
        dictates a failure for this provider. Does nothing for live environment.
        """
        if environment != "test":
            return

        behavior = self._behavior(db, merchant_id, environment, provider_alias)
        mode = behavior.get("mode", "off")

        if mode == "force_fail":
            raise HTTPException(
                status_code=502,
                detail={
                    "message": f"[Test mode] {provider_alias} forced to fail",
                    "test_mode": True,
                    "mode": "force_fail",
                },
            )

        if mode == "force_timeout":
            raise httpx.TimeoutException(
                f"[Test mode] {provider_alias} simulated timeout"
            )

        if mode == "random_fail":
            rate = float(behavior.get("fail_rate", 0)) / 100.0
            if rate > 0 and random.random() < rate:
                raise HTTPException(
                    status_code=502,
                    detail={
                        "message": f"[Test mode] {provider_alias} random failure ({behavior.get('fail_rate', 0)}%)",
                        "test_mode": True,
                        "mode": "random_fail",
                    },
                )

    def _behavior(
        self,
        db: Session,
        merchant_id: UUID,
        environment: str,
        provider_alias: str,
    ) -> dict:
        row = db.execute(
            select(ProviderRoutingConfiguration.metadata_json)
            .where(
                ProviderRoutingConfiguration.merchant_id == merchant_id,
                ProviderRoutingConfiguration.environment == environment,
            )
        ).scalar_one_or_none()

        if not row:
            return {}

        try:
            meta = json.loads(row) if isinstance(row, str) else (row or {})
        except (json.JSONDecodeError, TypeError):
            return {}

        return meta.get("provider_behaviors", {}).get(provider_alias.lower(), {})
