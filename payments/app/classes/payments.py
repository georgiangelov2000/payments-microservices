import httpx
import os
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.schemas.payments import CreatePaymentRequest
from app.models import (
    Provider,
    Payment as PaymentModel,
    ApiRequest,
    UserSubscription,
    Subscription,
    PaymentLog,
)
from app.db.sessions import PaymentsSessionLocal, LogsSessionLocal
from app.constants import (
    PAYMENT_PENDING,
    PAYMENT_FAILED,
    SUBSCRIPTION_ACTIVE,
    SUBSCRIPTION_INACTIVE,
    LOG_SUCCESS,
    EVENT_PAYMENT_CREATED,
    EVENT_PROVIDER_REQUEST_SENT,
)

PROVIDER_URL = os.getenv("PROVIDER_URL")


class Payment:
    """
    Handles payment creation lifecycle only

    Responsibilities:
    - Create payment
    - Update subscription usage
    - Call provider
    - Write logs to logs DB
    """

    # --------------------------------------------------
    # Create payment
    # --------------------------------------------------
    async def create_payment(self, request: CreatePaymentRequest, merchant_id: str):
        payments_db: Session = PaymentsSessionLocal()
        logs_db: Session = LogsSessionLocal()

        try:
            # --------------------------------------------------
            # Provider lookup (ONLY id + alias)
            # --------------------------------------------------
            provider_row = payments_db.execute(
                select(Provider.id, Provider.alias)
                .where(Provider.alias == request.alias)
            ).first()

            if not provider_row:
                raise HTTPException(status_code=400, detail="Provider not found")

            provider_id, provider_alias = provider_row

            # --------------------------------------------------
            # Idempotency check (ONLY id + status)
            # --------------------------------------------------
            existing = payments_db.execute(
                select(PaymentModel.id, PaymentModel.status)
                .where(PaymentModel.order_id == request.order_id)
            ).first()

            if existing:
                payment_id, status = existing
                return {
                    "message": "payment already exists",
                    "payment_id": payment_id,
                    "status": status,
                }

            # --------------------------------------------------
            # Load active subscription (ONLY needed columns)
            # --------------------------------------------------
            sub_row = payments_db.execute(
                select(
                    UserSubscription.id,
                    UserSubscription.used_tokens,
                    Subscription.tokens,
                )
                .join(
                    Subscription,
                    Subscription.id == UserSubscription.subscription_id,
                )
                .where(
                    UserSubscription.user_id == merchant_id,
                    UserSubscription.subscription_id == request.subscription_id,
                    UserSubscription.status == SUBSCRIPTION_ACTIVE,
                )
            ).first()

            if not sub_row:
                raise HTTPException(400, "Active subscription not found")

            subscription_id, used_tokens, max_tokens = sub_row

            # --------------------------------------------------
            # Create payment (ORM needed for ID)
            # --------------------------------------------------
            payment = PaymentModel(
                order_id=request.order_id,
                amount=request.amount,
                price=request.price,
                provider_id=provider_id,
                merchant_id=merchant_id,
                status=PAYMENT_PENDING,
            )

            payments_db.add(payment)
            payments_db.flush()  # get payment.id
            payment_id = payment.id

            # --------------------------------------------------
            # LOG: payment created (logs DB)
            # --------------------------------------------------
            logs_db.add(
                PaymentLog(
                    payment_id=payment_id,
                    event_type=EVENT_PAYMENT_CREATED,
                    status=LOG_SUCCESS,
                    message="Payment created",
                )
            )

            # --------------------------------------------------
            # Update subscription usage (DIRECT UPDATE)
            # --------------------------------------------------
            new_used = used_tokens + 1
            new_status = (
                SUBSCRIPTION_INACTIVE
                if new_used >= max_tokens
                else SUBSCRIPTION_ACTIVE
            )

            payments_db.execute(
                UserSubscription.__table__.update()
                .where(UserSubscription.id == subscription_id)
                .values(
                    used_tokens=new_used,
                    status=new_status,
                )
            )

            # --------------------------------------------------
            # API request audit (payments DB)
            # --------------------------------------------------
            payments_db.add(
                ApiRequest(
                    event_id=request.event_id,
                    user_id=merchant_id,
                    subscription_id=request.subscription_id,
                    payment_id=payment_id,
                    amount=request.amount,
                    source="payments:create",
                )
            )

            # --------------------------------------------------
            # Commit atomically
            # --------------------------------------------------
            payments_db.commit()
            logs_db.commit()

        except Exception:
            payments_db.rollback()
            logs_db.rollback()
            raise

        finally:
            payments_db.close()
            logs_db.close()

        # --------------------------------------------------
        # LOG: provider request sent (logs DB)
        # --------------------------------------------------
        logs_db = LogsSessionLocal()
        try:
            logs_db.add(
                PaymentLog(
                    payment_id=payment_id,
                    event_type=EVENT_PROVIDER_REQUEST_SENT,
                    status=LOG_SUCCESS,
                    message="Provider URL request sent",
                    payload=f'{{"provider":"{provider_alias}"}}',
                )
            )
            logs_db.commit()
        finally:
            logs_db.close()

        # --------------------------------------------------
        # Call provider AFTER commit
        # --------------------------------------------------
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.post(
                    f"{PROVIDER_URL}/payment-links",
                    json={
                        "payment_id": payment_id,
                        "merchant_id": merchant_id,
                        "provider": provider_alias,
                    },
                )
        except httpx.RequestError:
            await self._mark_failed_if_pending(payment_id)
            raise HTTPException(status_code=502, detail="Provider unreachable")

        if resp.status_code != 200:
            await self._mark_failed_if_pending(payment_id)
            raise HTTPException(
                status_code=502,
                detail="Provider URL generation failed",
            )

        return {
            "payment_id": payment_id,
            "status": PAYMENT_PENDING,
            "payment_url": resp.json().get("payment_url"),
        }

    # --------------------------------------------------
    # Safe failure transition (payments DB only)
    # --------------------------------------------------
    async def _mark_failed_if_pending(self, payment_id: int):
        payments_db: Session = PaymentsSessionLocal()
        try:
            row = payments_db.execute(
                select(PaymentModel.status)
                .where(PaymentModel.id == payment_id)
            ).first()

            if row and row[0] == PAYMENT_PENDING:
                payments_db.execute(
                    PaymentModel.__table__.update()
                    .where(PaymentModel.id == payment_id)
                    .values(status=PAYMENT_FAILED)
                )
                payments_db.commit()
        finally:
            payments_db.close()
