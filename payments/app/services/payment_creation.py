import json
import time
from datetime import datetime
from typing import cast
from uuid import UUID

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.context import logs_session, payments_session
from app.enums import LogStatus, PaymentLogEvent, PaymentStatus, SubscriptionStatus
from app.json_types import JsonObject
from app.models.logs import PaymentLog
from app.models.payments import (
    PaymentRoutingAttempt,
    UserSubscription,
)
from app.models.payments import (
    Payment as PaymentModel,
)
from app.providers.base import CheckoutRequest
from app.services.decline_classifier import extract_decline_code, is_hard_decline
from app.providers.credential_resolver import CredentialResolver
from app.providers.registry import provider_connector
from app.routing import PaymentRoutingEngine
from app.schemas.payments import CreatePaymentRequest, PaymentCreateResponse
from app.services.provider_simulation import ProviderSimulationService
from app.services.webhook_dispatcher import WebhookDispatcher

_dispatcher = WebhookDispatcher()


class PaymentCreationService:
    def __init__(self) -> None:
        self.routing_engine = PaymentRoutingEngine()
        self.credential_resolver = CredentialResolver()
        self.provider_simulation = ProviderSimulationService()

    async def create(
        self, request: CreatePaymentRequest, merchant_id: str
    ) -> PaymentCreateResponse:
        merchant_uuid = UUID(str(merchant_id))

        with payments_session() as payments_db, logs_session() as logs_db:
            # --------------------------------------------------
            # Idempotency check
            # --------------------------------------------------
            existing = payments_db.execute(
                select(
                    PaymentModel.id, PaymentModel.status, PaymentModel.provider_checkout_url
                ).where(PaymentModel.order_id == request.order_id)
            ).first()

            if existing:
                payment_id, status, checkout_url = existing
                return PaymentCreateResponse(
                    message="payment already exists",
                    payment_id=str(payment_id),
                    status=PaymentStatus(status).name,
                    payment_url=checkout_url,
                )

            routing_plan = await self.routing_engine.plan(payments_db, merchant_uuid, request)

            if not routing_plan.candidates:
                raise HTTPException(
                    status_code=503,
                    detail={
                        "message": "No healthy payment provider is available for this transaction",
                        "routing": routing_plan.snapshot,
                    },
                )

            primary_provider = routing_plan.candidates[0]
            idempotency_key = (
                request.idempotency_key or f"{merchant_uuid}:{request.event_id}:{request.order_id}"
            )

            # --------------------------------------------------
            # Load active merchant subscription
            # --------------------------------------------------
            sub_row = payments_db.execute(
                select(UserSubscription.id).where(
                    UserSubscription.user_id == merchant_uuid,
                    UserSubscription.subscription_id == request.subscription_id,
                    UserSubscription.status == SubscriptionStatus.SUBSCRIPTION_ACTIVE.value,
                )
            ).first()

            if not sub_row:
                raise HTTPException(400, "Active subscription not found")

            subscription_id = sub_row[0]

            # --------------------------------------------------
            # Create payment record
            # --------------------------------------------------
            payment = PaymentModel(
                order_id=request.order_id,
                price=request.price,
                provider_id=primary_provider.id,
                merchant_id=merchant_uuid,
                status=PaymentStatus.PAYMENT_PENDING.value,
                environment=routing_plan.environment,
                currency=request.currency.upper(),
                country=request.country.upper() if request.country else None,
                locale=request.locale,
                channel=request.channel,
                routing_strategy=routing_plan.strategy,
                idempotency_key=idempotency_key,
                routing_metadata={
                    "matched_rule": routing_plan.matched_rule,
                    "candidate_order": [c.alias for c in routing_plan.candidates],
                    "snapshot": routing_plan.snapshot,
                },
            )

            payments_db.add(payment)
            try:
                payments_db.flush()
            except IntegrityError:
                # Concurrent request already inserted this order_id — roll back and
                # return the existing record as an idempotent response.
                payments_db.rollback()
                existing = payments_db.execute(
                    select(
                        PaymentModel.id,
                        PaymentModel.status,
                        PaymentModel.provider_checkout_url,
                    ).where(PaymentModel.order_id == request.order_id)
                ).first()
                if existing:
                    payment_id, status, checkout_url = existing
                    return PaymentCreateResponse(
                        message="payment already exists",
                        payment_id=str(payment_id),
                        status=PaymentStatus(status).name,
                        payment_url=checkout_url,
                    )
                raise
            payment_id = cast(UUID, payment.id)

            # --------------------------------------------------
            # LOG: payment created
            # --------------------------------------------------
            logs_db.add(
                PaymentLog(
                    payment_id=payment_id,
                    event_type=PaymentLogEvent.EVENT_PAYMENT_CREATED.value,
                    status=LogStatus.LOG_SUCCESS.value,
                    message=(
                        f"[{datetime.utcnow().isoformat()}] Payment created with "
                        f"{routing_plan.strategy} routing"
                    ),
                    payload=json.dumps(routing_plan.snapshot),
                )
            )

            # --------------------------------------------------
            # Atomic commit
            # --------------------------------------------------
            payments_db.commit()
            logs_db.commit()

        # --------------------------------------------------
        # Provider failover loop (runs outside the initial session)
        # --------------------------------------------------
        checkout = None
        provider_alias = None
        provider_id = None

        for attempt_number, candidate in enumerate(routing_plan.candidates, start=1):
            provider_alias = candidate.alias
            provider_id = candidate.id
            attempt_idempotency_key = f"{idempotency_key}:{provider_alias}"
            started = time.monotonic()

            # --------------------------------------------------
            # Circuit breaker: re-check provider health before calling
            # --------------------------------------------------
            with payments_session() as payments_db:
                is_healthy = await self.routing_engine.health.is_available(
                    payments_db, merchant_uuid, routing_plan.environment, provider_alias
                )

            if not is_healthy:
                await self._record_routing_attempt(
                    payment_id=payment_id,
                    merchant_id=merchant_uuid,
                    provider_id=provider_id,
                    provider_alias=provider_alias,
                    environment=routing_plan.environment,
                    strategy=routing_plan.strategy,
                    attempt_number=attempt_number,
                    status="skipped",
                    idempotency_key=attempt_idempotency_key,
                    latency_ms=0,
                    error_code="circuit_open",
                    error_message="Provider is quarantined by health monitor",
                    routing_snapshot=routing_plan.snapshot,
                )
                continue

            # --------------------------------------------------
            # Resolve per-merchant credentials for this provider
            # --------------------------------------------------
            try:
                with payments_session() as payments_db:
                    credentials = self.credential_resolver.resolve(
                        payments_db, merchant_uuid, provider_alias, routing_plan.environment
                    )
            except HTTPException as exc:
                await self._record_routing_attempt(
                    payment_id=payment_id,
                    merchant_id=merchant_uuid,
                    provider_id=provider_id,
                    provider_alias=provider_alias,
                    environment=routing_plan.environment,
                    strategy=routing_plan.strategy,
                    attempt_number=attempt_number,
                    status="skipped",
                    idempotency_key=attempt_idempotency_key,
                    latency_ms=0,
                    error_code="missing_credentials",
                    error_message=str(exc.detail),
                    routing_snapshot=routing_plan.snapshot,
                )
                continue

            # --------------------------------------------------
            # Provider simulation check (test mode only)
            # --------------------------------------------------
            try:
                with payments_session() as payments_db:
                    self.provider_simulation.check(
                        payments_db, merchant_uuid, routing_plan.environment, provider_alias
                    )
            except HTTPException as exc:
                await self._record_routing_attempt(
                    payment_id=payment_id,
                    merchant_id=merchant_uuid,
                    provider_id=provider_id,
                    provider_alias=provider_alias,
                    environment=routing_plan.environment,
                    strategy=routing_plan.strategy,
                    attempt_number=attempt_number,
                    status="failed",
                    idempotency_key=attempt_idempotency_key,
                    latency_ms=0,
                    error_code="test_mode_fail",
                    error_message=str(exc.detail),
                    routing_snapshot=routing_plan.snapshot,
                )
                await self._record_provider_failure(
                    merchant_uuid, provider_id, routing_plan.environment,
                    provider_alias, "test_mode_simulated_failure", timed_out=False,
                )
                continue
            except Exception as exc:
                # force_timeout raises httpx.TimeoutException
                await self._record_routing_attempt(
                    payment_id=payment_id,
                    merchant_id=merchant_uuid,
                    provider_id=provider_id,
                    provider_alias=provider_alias,
                    environment=routing_plan.environment,
                    strategy=routing_plan.strategy,
                    attempt_number=attempt_number,
                    status="timeout",
                    idempotency_key=attempt_idempotency_key,
                    latency_ms=0,
                    error_code="test_mode_timeout",
                    error_message=str(exc),
                    routing_snapshot=routing_plan.snapshot,
                )
                await self._record_provider_failure(
                    merchant_uuid, provider_id, routing_plan.environment,
                    provider_alias, "test_mode_simulated_timeout", timed_out=True,
                )
                continue

            self._record_provider_request_log(
                payment_id=payment_id,
                provider_alias=provider_alias,
                attempt_number=attempt_number,
                routing_snapshot=routing_plan.snapshot,
            )

            with payments_session() as payments_db:
                payments_db.execute(
                    PaymentModel.__table__.update()
                    .where(PaymentModel.id == payment_id)
                    .values(provider_id=provider_id)
                )
                payments_db.commit()

            try:
                checkout = await provider_connector(provider_alias, credentials).create_checkout(
                    CheckoutRequest(
                        payment_id=str(payment_id),
                        merchant_id=str(merchant_uuid),
                        order_id=request.order_id,
                        amount=request.price,
                        currency=request.currency,
                        description=f"Order #{request.order_id}",
                        idempotency_key=attempt_idempotency_key,
                        environment=routing_plan.environment,
                        credentials=credentials,
                    )
                )
            except HTTPException as exc:
                decline_code = extract_decline_code(exc.detail)
                hard = is_hard_decline(decline_code, exc.detail)
                await self._record_routing_attempt(
                    payment_id=payment_id,
                    merchant_id=merchant_uuid,
                    provider_id=provider_id,
                    provider_alias=provider_alias,
                    environment=routing_plan.environment,
                    strategy=routing_plan.strategy,
                    attempt_number=attempt_number,
                    status="hard_declined" if hard else "failed",
                    idempotency_key=attempt_idempotency_key,
                    latency_ms=int((time.monotonic() - started) * 1000),
                    error_code=decline_code,
                    error_message=str(exc.detail)[:2000],
                    routing_snapshot=routing_plan.snapshot,
                )
                # Hard declines (invalid amount, bad currency, etc.) mean the
                # payment request itself is wrong — no point trying other providers.
                if hard:
                    await self._mark_failed_if_pending(payment_id)
                    await self._dispatch_event(payment_id, merchant_uuid, "payment.failed")
                    raise HTTPException(
                        status_code=422,
                        detail={
                            "message": f"Hard decline from {provider_alias}: {decline_code}",
                            "decline_code": decline_code,
                            "provider": provider_alias,
                        },
                    )
                await self._record_provider_failure(
                    merchant_uuid,
                    provider_id,
                    routing_plan.environment,
                    provider_alias,
                    str(exc.detail),
                    timed_out=False,
                )
                continue
            except httpx.TimeoutException as exc:
                await self._record_routing_attempt(
                    payment_id,
                    merchant_uuid,
                    provider_id,
                    provider_alias,
                    routing_plan.environment,
                    routing_plan.strategy,
                    attempt_number,
                    "timeout",
                    attempt_idempotency_key,
                    int((time.monotonic() - started) * 1000),
                    "timeout",
                    str(exc),
                    routing_plan.snapshot,
                )
                await self._record_provider_failure(
                    merchant_uuid,
                    provider_id,
                    routing_plan.environment,
                    provider_alias,
                    str(exc),
                    timed_out=True,
                )
                continue
            except httpx.RequestError as exc:
                await self._record_routing_attempt(
                    payment_id,
                    merchant_uuid,
                    provider_id,
                    provider_alias,
                    routing_plan.environment,
                    routing_plan.strategy,
                    attempt_number,
                    "failed",
                    attempt_idempotency_key,
                    int((time.monotonic() - started) * 1000),
                    "network_error",
                    str(exc),
                    routing_plan.snapshot,
                )
                await self._record_provider_failure(
                    merchant_uuid,
                    provider_id,
                    routing_plan.environment,
                    provider_alias,
                    str(exc),
                    timed_out=False,
                )
                continue

            await self._record_routing_attempt(
                payment_id=payment_id,
                merchant_id=merchant_uuid,
                provider_id=provider_id,
                provider_alias=provider_alias,
                environment=routing_plan.environment,
                strategy=routing_plan.strategy,
                attempt_number=attempt_number,
                status="succeeded",
                idempotency_key=attempt_idempotency_key,
                latency_ms=int((time.monotonic() - started) * 1000),
                error_code=None,
                error_message=None,
                routing_snapshot=routing_plan.snapshot,
            )
            await self._record_provider_success(
                merchant_uuid, provider_id, routing_plan.environment, provider_alias,
                subscription_id=subscription_id, price=request.price,
            )
            break

        if checkout is None or provider_alias is None:
            await self._mark_failed_if_pending(payment_id)
            await self._dispatch_event(payment_id, merchant_uuid, "payment.failed")
            raise HTTPException(
                status_code=502,
                detail={
                    "message": "All routed payment providers failed or had no credentials configured",
                    "attempted_providers": [c.alias for c in routing_plan.candidates],
                },
            )

        now = datetime.utcnow().isoformat()

        with payments_session() as payments_db:
            payments_db.execute(
                PaymentModel.__table__.update()
                .where(PaymentModel.id == payment_id)
                .values(
                    provider_reference=checkout.provider_reference,
                    provider_checkout_url=checkout.payment_url,
                    provider_status=checkout.raw_status,
                    provider_id=provider_id,
                )
            )
            payments_db.commit()

        with logs_session() as logs_db:
            logs_db.execute(
                PaymentLog.__table__.update()
                .where(
                    PaymentLog.payment_id == payment_id,
                    PaymentLog.event_type == PaymentLogEvent.EVENT_PROVIDER_REQUEST_SENT.value,
                )
                .values(
                    message=(
                        PaymentLog.message
                        + "\n"
                        + f"[{now}] Customer redirect ready — awaiting payment at {provider_alias.capitalize()} checkout."
                    ),
                    payload=json.dumps(
                        {
                            "provider": provider_alias,
                            "provider_reference": checkout.provider_reference,
                            "payment_url": checkout.payment_url,
                            "routing_strategy": routing_plan.strategy,
                        }
                    ),
                )
            )
            logs_db.commit()

        await self._dispatch_event(payment_id, merchant_uuid, "payment.created")

        return PaymentCreateResponse(
            payment_id=str(payment_id),
            status=PaymentStatus.PAYMENT_PENDING.name,
            provider=provider_alias,
            routing_strategy=routing_plan.strategy,
            routing_candidates=[c.alias for c in routing_plan.candidates],
            provider_reference=checkout.provider_reference,
            payment_url=checkout.payment_url,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _record_provider_request_log(
        self,
        payment_id: UUID,
        provider_alias: str,
        attempt_number: int,
        routing_snapshot: JsonObject,
    ) -> None:
        with logs_session() as logs_db:
            logs_db.add(
                PaymentLog(
                    payment_id=payment_id,
                    event_type=PaymentLogEvent.EVENT_PROVIDER_REQUEST_SENT.value,
                    status=LogStatus.LOG_SUCCESS.value,
                    message=(
                        f"[{datetime.utcnow().isoformat()}] Checkout session created with "
                        f"{provider_alias.capitalize()} (attempt {attempt_number})"
                    ),
                    payload=json.dumps(
                        {
                            "provider": provider_alias,
                            "attempt": attempt_number,
                            "routing": routing_snapshot,
                        }
                    ),
                )
            )
            logs_db.commit()

    async def _record_provider_success(
        self,
        merchant_id: UUID,
        provider_id: UUID | None,
        environment: str,
        provider_alias: str,
        *,
        subscription_id: UUID,
        price: float,
    ) -> None:
        with payments_session() as payments_db:
            await self.routing_engine.health.record_success(
                payments_db, merchant_id, provider_id, environment, provider_alias
            )
            # Increment billing-period usage only after the provider confirms
            # a successful checkout — failed attempts must not consume quota.
            payments_db.execute(
                UserSubscription.__table__.update()
                .where(UserSubscription.id == subscription_id)
                .values(
                    current_period_transactions=(UserSubscription.current_period_transactions + 1),
                    current_period_volume=(UserSubscription.current_period_volume + price),
                )
            )
            payments_db.commit()

    async def _record_provider_failure(
        self,
        merchant_id: UUID,
        provider_id: UUID | None,
        environment: str,
        provider_alias: str,
        error: str,
        timed_out: bool,
    ) -> None:
        with payments_session() as payments_db:
            await self.routing_engine.health.record_failure(
                payments_db,
                merchant_id,
                provider_id,
                environment,
                provider_alias,
                error,
                timed_out,
            )
            payments_db.commit()

    async def _record_routing_attempt(
        self,
        payment_id: UUID,
        merchant_id: UUID,
        provider_id: UUID | None,
        provider_alias: str,
        environment: str,
        strategy: str,
        attempt_number: int,
        status: str,
        idempotency_key: str,
        latency_ms: int,
        error_code: str | None,
        error_message: str | None,
        routing_snapshot: JsonObject,
    ) -> None:
        with payments_session() as payments_db:
            payments_db.add(
                PaymentRoutingAttempt(
                    payment_id=payment_id,
                    merchant_id=merchant_id,
                    provider_id=provider_id,
                    provider_alias=provider_alias,
                    environment=environment,
                    strategy=strategy,
                    attempt_number=attempt_number,
                    status=status,
                    idempotency_key=idempotency_key,
                    latency_ms=latency_ms,
                    error_code=error_code,
                    error_message=error_message[:4000] if error_message else None,
                    routing_snapshot=json.dumps(routing_snapshot),
                )
            )
            payments_db.commit()

    async def _mark_failed_if_pending(self, payment_id: UUID | str) -> None:
        payment_uuid = payment_id if isinstance(payment_id, UUID) else UUID(str(payment_id))
        with payments_session() as payments_db:
            payments_db.execute(
                PaymentModel.__table__.update()
                .where(PaymentModel.id == payment_uuid)
                .where(PaymentModel.status == PaymentStatus.PAYMENT_PENDING.value)
                .values(status=PaymentStatus.PAYMENT_FAILED.value)
            )
            payments_db.commit()

    async def _dispatch_event(
        self, payment_id: UUID | str, merchant_id: UUID, event: str
    ) -> None:
        payment_uuid = payment_id if isinstance(payment_id, UUID) else UUID(str(payment_id))
        with payments_session() as payments_db:
            payment = payments_db.get(PaymentModel, payment_uuid)
        if payment:
            await _dispatcher.dispatch(merchant_id, event, payment)
