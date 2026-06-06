import hashlib
import json
from dataclasses import dataclass
from decimal import Decimal
from typing import cast
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.json_types import JsonObject, JsonValue
from app.models.payments import (
    MerchantProviderCredential,
    Provider,
    ProviderRoutingConfiguration,
    ProviderRoutingRule,
)
from app.routing.health import ProviderHealthMonitor
from app.schemas.payments import CreatePaymentRequest


@dataclass(frozen=True)
class ProviderCandidate:
    id: UUID
    alias: str


@dataclass(frozen=True)
class RoutingPlan:
    strategy: str
    environment: str
    candidates: list[ProviderCandidate]
    matched_rule: str | None
    snapshot: JsonObject


class PaymentRoutingEngine:
    def __init__(self) -> None:
        self.health = ProviderHealthMonitor()

    async def plan(
        self, db: Session, merchant_id: UUID, request: CreatePaymentRequest
    ) -> RoutingPlan:
        environment = request.environment
        available = self._available_providers(db, merchant_id, environment)
        requested_alias = request.alias.lower() if request.alias else None

        if requested_alias and not any(
            candidate.alias == requested_alias for candidate in available
        ):
            return RoutingPlan(
                strategy="unavailable",
                environment=environment,
                candidates=[],
                matched_rule=None,
                snapshot={
                    "reason": "requested_provider_not_connected",
                    "requested_alias": requested_alias,
                },
            )

        if not available:
            return RoutingPlan(
                strategy="unavailable",
                environment=environment,
                candidates=[],
                matched_rule=None,
                snapshot={"reason": "no_connected_provider", "requested_alias": request.alias},
            )

        filtered: list[ProviderCandidate] = []
        for candidate in available:
            if await self.health.is_available(db, merchant_id, environment, candidate.alias):
                filtered.append(candidate)

        if not filtered:
            return RoutingPlan(
                strategy="health_blocked",
                environment=environment,
                candidates=[],
                matched_rule=None,
                snapshot={
                    "available": [candidate.alias for candidate in available],
                    "reason": "all_unhealthy",
                },
            )

        rule = self._matching_rule(db, merchant_id, environment, request)
        if rule:
            rule_provider_alias = str(rule.provider_alias)
            ordered = self._put_first(filtered, requested_alias or rule_provider_alias)
            return self._with_failover(
                db=db,
                merchant_id=merchant_id,
                environment=environment,
                base=ordered,
                strategy="conditional",
                matched_rule=str(rule.id),
                snapshot={
                    "rule": str(rule.name),
                    "conditions": self._json_object(str(rule.conditions)),
                },
            )

        config = self._configuration(db, merchant_id, environment)
        if not config or not bool(config.enabled):
            priority = [requested_alias] if requested_alias else ["stripe", "paypal"]
            ordered = self._order_by_aliases(filtered, priority)
            return RoutingPlan("priority", environment, ordered, None, {"source": "default"})

        strategy = str(config.strategy or "priority")
        if strategy == "weighted":
            weights = self._json_object(str(config.weighted_distribution))
            ordered = self._weighted_order(filtered, weights, request)
            if requested_alias:
                ordered = self._put_first(ordered, requested_alias)
            return self._with_failover(
                db,
                merchant_id,
                environment,
                ordered,
                "weighted",
                None,
                {"weights": weights, "requested_alias": requested_alias},
            )

        priority_chain = self._json_list(str(config.priority_chain))
        if requested_alias:
            priority_chain = self._unique_aliases([requested_alias, *priority_chain])
        ordered = self._order_by_aliases(filtered, priority_chain)
        return self._with_failover(
            db,
            merchant_id,
            environment,
            ordered,
            strategy,
            None,
            {
                "priority_chain": cast(JsonValue, priority_chain),
                "requested_alias": requested_alias,
            },
        )

    def _configuration(
        self,
        db: Session,
        merchant_id: UUID,
        environment: str,
    ) -> ProviderRoutingConfiguration | None:
        return db.execute(
            select(ProviderRoutingConfiguration).where(
                ProviderRoutingConfiguration.merchant_id == merchant_id,
                ProviderRoutingConfiguration.environment == environment,
            )
        ).scalar_one_or_none()

    def _available_providers(
        self, db: Session, merchant_id: UUID, environment: str
    ) -> list[ProviderCandidate]:
        rows = db.execute(
            select(Provider.id, Provider.alias)
            .join(MerchantProviderCredential, MerchantProviderCredential.provider_id == Provider.id)
            .where(
                MerchantProviderCredential.merchant_id == merchant_id,
                MerchantProviderCredential.environment == environment,
                MerchantProviderCredential.status.in_(["active", "validated", "pending"]),
            )
            .order_by(Provider.alias)
        ).all()

        # Hard-fail if merchant has no connected providers. Never fall back to
        # platform-wide providers — that would route another merchant's payment
        # through the wrong credentials.
        return [
            ProviderCandidate(id=cast(UUID, row.id), alias=str(row.alias).lower()) for row in rows
        ]

    def _matching_rule(
        self, db: Session, merchant_id: UUID, environment: str, request: CreatePaymentRequest
    ) -> ProviderRoutingRule | None:
        rules = (
            db.execute(
                select(ProviderRoutingRule)
                .where(
                    ProviderRoutingRule.merchant_id == merchant_id,
                    ProviderRoutingRule.environment == environment,
                    ProviderRoutingRule.enabled.is_(True),
                )
                .order_by(ProviderRoutingRule.priority.asc())
            )
            .scalars()
            .all()
        )

        for rule in rules:
            if self._matches(self._json_object(str(rule.conditions)), request):
                return rule

        return None

    def _matches(self, conditions: JsonObject, request: CreatePaymentRequest) -> bool:
        price = Decimal(request.price)
        context = {
            "country": request.country,
            "billing_country": request.billing_country,
            "currency": request.currency.upper(),
            "card_type": request.card_type,
            "payment_method": request.payment_method,
            "recurring": request.recurring,
            "environment": request.environment,
            "channel": request.channel,
        }

        for key, expected in conditions.items():
            if expected in (None, "", []):
                continue

            if key == "min_amount" and price < Decimal(str(expected)):
                return False
            if key == "max_amount" and price > Decimal(str(expected)):
                return False
            if key == "min_risk_score":
                risk_threshold = self._int_value(expected)
                if (
                    request.risk_score is None
                    or risk_threshold is None
                    or request.risk_score < risk_threshold
                ):
                    return False
                continue
            if key == "max_risk_score":
                risk_threshold = self._int_value(expected)
                if (
                    request.risk_score is None
                    or risk_threshold is None
                    or request.risk_score > risk_threshold
                ):
                    return False
                continue

            if key not in context:
                continue

            actual = context[key]
            if key == "recurring":
                allowed_bool = expected if isinstance(expected, list) else [expected]
                normalized = [value in (True, "true", "1", 1) for value in allowed_bool]
                if actual not in normalized:
                    return False
                continue

            allowed = expected if isinstance(expected, list) else [expected]
            if actual not in allowed:
                return False

        return True

    def _with_failover(
        self,
        db: Session,
        merchant_id: UUID,
        environment: str,
        base: list[ProviderCandidate],
        strategy: str,
        matched_rule: str | None,
        snapshot: JsonObject,
    ) -> RoutingPlan:
        config = self._configuration(db, merchant_id, environment)
        failover = self._json_list(str(config.failover_chain)) if config else []
        ordered = self._order_by_aliases(base, [candidate.alias for candidate in base] + failover)

        return RoutingPlan(
            strategy=strategy,
            environment=environment,
            candidates=ordered,
            matched_rule=matched_rule,
            snapshot={
                **snapshot,
                "failover_chain": cast(JsonValue, failover),
                "candidate_order": cast(JsonValue, [candidate.alias for candidate in ordered]),
            },
        )

    def _weighted_order(
        self,
        candidates: list[ProviderCandidate],
        weights: JsonObject,
        request: CreatePaymentRequest,
    ) -> list[ProviderCandidate]:
        weighted = [
            (candidate, self._int_value(weights.get(candidate.alias)) or 0)
            for candidate in candidates
        ]
        weighted = [(candidate, weight) for candidate, weight in weighted if weight > 0]

        if not weighted:
            return candidates

        total = sum(weight for _, weight in weighted)
        token = f"{request.event_id}:{request.order_id}:{request.idempotency_key or ''}"
        bucket = int(hashlib.sha256(token.encode()).hexdigest(), 16) % total
        cursor = 0
        selected = weighted[0][0]

        for candidate, weight in weighted:
            cursor += weight
            if bucket < cursor:
                selected = candidate
                break

        return self._put_first(candidates, selected.alias)

    def _put_first(
        self, candidates: list[ProviderCandidate], alias: str
    ) -> list[ProviderCandidate]:
        alias = alias.lower()
        return [candidate for candidate in candidates if candidate.alias == alias] + [
            candidate for candidate in candidates if candidate.alias != alias
        ]

    def _order_by_aliases(
        self, candidates: list[ProviderCandidate], aliases: list[str]
    ) -> list[ProviderCandidate]:
        by_alias = {candidate.alias: candidate for candidate in candidates}
        ordered: list[ProviderCandidate] = []

        for alias in aliases:
            candidate = by_alias.get(str(alias).lower())
            if candidate and candidate not in ordered:
                ordered.append(candidate)

        ordered.extend(candidate for candidate in candidates if candidate not in ordered)
        return ordered

    def _unique_aliases(self, aliases: list[str]) -> list[str]:
        seen: set[str] = set()
        unique: list[str] = []

        for alias in aliases:
            normalized = str(alias).lower()
            if normalized in seen:
                continue
            seen.add(normalized)
            unique.append(normalized)

        return unique

    def _json_object(self, value: JsonValue | str | None) -> JsonObject:
        if isinstance(value, dict):
            return value
        if not value:
            return {}
        try:
            parsed = json.loads(value) if isinstance(value, str) else value
        except (TypeError, ValueError):
            return {}
        return cast(JsonObject, parsed) if isinstance(parsed, dict) else {}

    def _json_list(self, value: JsonValue | str | None) -> list[str]:
        if isinstance(value, list):
            raw = value
        elif not value:
            raw = []
        else:
            try:
                parsed = json.loads(value) if isinstance(value, str) else value
            except (TypeError, ValueError):
                raw = []
            else:
                raw = parsed if isinstance(parsed, list) else []

        return [str(item).lower() for item in raw if item]

    def _int_value(self, value: JsonValue | None) -> int | None:
        if isinstance(value, bool) or value is None:
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        if isinstance(value, str):
            try:
                return int(value)
            except ValueError:
                return None
        return None
