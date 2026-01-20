import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.schemas.payments import (
    CreatePaymentRequest,
    PaymentWebhookRequest,
)
from app.models import (
    Provider,
    Payment as PaymentModel,
    PaymentStatus,
    ApiRequest,
    UserSubscription,
    Subscription,
    SubscriptionStatus,
    PaymentLog,
)
from app.db import SessionLocal
from app.classes import rabbitmq
from app.dto.payments import PaymentDTO


# =========================
# Payment log constants
# =========================

EVENT_PAYMENT_CREATED = 1
EVENT_PROVIDER_REQUEST_SENT = 2
EVENT_PROVIDER_PAYMENT_ACCEPTED = 3

STATUS_SUCCESS = 1
STATUS_FAILED = 2


class Payment:
    """
    Handles payment lifecycle:
    - create payment
    - provider interaction
    - webhook updates§
    """

    # --------------------------------------------------
    # Create payment
    # --------------------------------------------------
    async def create_payment(self, request: CreatePaymentRequest, merchant_id: str):
        db: Session = SessionLocal()

        try:
            # ---------------------------
            # Provider lookup
            # ---------------------------
            provider = db.execute(
                select(Provider).where(Provider.alias == request.alias)
            ).scalar_one_or_none()

            if not provider:
                raise HTTPException(status_code=400, detail="Provider not found")

            # ---------------------------
            # Idempotency (order_id)
            # ---------------------------
            existing = db.execute(
                select(PaymentModel)
                .where(PaymentModel.order_id == request.order_id)
            ).scalar_one_or_none()

            if existing:
                return {
                    "message": "payment already exists",
                    "payment_id": existing.id,
                    "status": existing.status.value,
                }

            # ---------------------------
            # Load user subscription
            # ---------------------------
            user_sub = db.execute(
                select(UserSubscription, Subscription)
                .join(
                    Subscription,
                    Subscription.id == UserSubscription.subscription_id,
                )
                .where(
                    UserSubscription.user_id == merchant_id,
                    UserSubscription.subscription_id == request.subscription_id,
                    UserSubscription.status == SubscriptionStatus.active,
                )
            ).first()

            if not user_sub:
                raise HTTPException(
                    status_code=400,
                    detail="Active subscription not found",
                )

            user_subscription, subscription = user_sub

            # ---------------------------
            # Create payment
            # ---------------------------
            payment = PaymentModel(
                order_id=request.order_id,
                amount=request.amount,
                price=request.price,
                provider_id=provider.id,
                merchant_id=merchant_id,
                status=PaymentStatus.pending,
            )

            db.add(payment)
            db.flush()  # get payment.id without commit

            # ---------------------------
            # LOG: payment_created
            # ---------------------------
            db.add(
                PaymentLog(
                    payment_id=payment.id,
                    event_type=EVENT_PAYMENT_CREATED,
                    status=STATUS_SUCCESS,
                    message="Payment created",
                    payload=None,
                )
            )

            # ---------------------------
            # Update subscription usage
            # ---------------------------
            user_subscription.used_tokens += 1

            if user_subscription.used_tokens >= subscription.tokens:
                user_subscription.status = SubscriptionStatus.inactive

            # ---------------------------
            # Log API request
            # ---------------------------
            api_request = ApiRequest(
                event_id=request.event_id,
                user_id=merchant_id,
                subscription_id=request.subscription_id,
                payment_id=payment.id,
                amount=request.amount,
                source="payments:create",
            )

            db.add(api_request)

            # ---------------------------
            # Commit atomically
            # ---------------------------
            db.commit()
            db.refresh(payment)

            payment_id = payment.id
            provider_alias = provider.alias

        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

        # ---------------------------
        # LOG: provider_request_sent (after commit)
        # ---------------------------
        db2: Session = SessionLocal()
        try:
            db2.add(
                PaymentLog(
                    payment_id=payment_id,
                    event_type=EVENT_PROVIDER_REQUEST_SENT,
                    status=STATUS_SUCCESS,
                    message="Provider URL request sent",
                    payload=f'{{"provider":"{provider_alias}"}}',
                )
            )
            db2.commit()
        finally:
            db2.close()

        # ---------------------------
        # Call provider AFTER commit
        # ---------------------------
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.post(
                    "http://provider:8000/payment-links",
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
            "status": PaymentStatus.pending.value,
            "payment_url": resp.json().get("payment_url"),
        }


    # --------------------------------------------------
    # Webhook handler (idempotent)
    # --------------------------------------------------
    async def webhook(self, request: PaymentWebhookRequest):
        db: Session = SessionLocal()

        try:
            payment = db.get(PaymentModel, request.payment_id)

            if not payment:
                return {"message": "payment not found"}

            if payment.status in (
                PaymentStatus.finished,
                PaymentStatus.failed,
            ):
                return {
                    "message": "already processed",
                    "status": payment.status.value,
                }

            if request.status == "finished":
                payment.status = PaymentStatus.finished
            elif request.status == "failed":
                payment.status = PaymentStatus.failed
            else:
                return {"message": "unsupported status"}

            # ---------------------------
            # LOG: provider_payment_accepted
            # ---------------------------
            db.add(
                PaymentLog(
                    payment_id=payment.id,
                    event_type=EVENT_PROVIDER_PAYMENT_ACCEPTED,
                    status=STATUS_SUCCESS if request.status == "finished" else STATUS_FAILED,
                    message="Provider payment accepted"
                    if request.status == "finished"
                    else "Provider payment failed",
                    payload=f'{{"provider_status":"{request.status}"}}',
                )
            )

            db.commit()

            payment_dto = PaymentDTO(
                payment_id=payment.id,
                order_id=payment.order_id,
                merchant_id=payment.merchant_id,
                status=payment.status.value,
                amount=str(payment.amount),
                price=str(payment.price),
            )

        finally:
            db.close()

        await rabbitmq.publish_payment_event(payment_dto)

        return {
            "message": "payment updated",
            "payment_id": payment_dto.payment_id,
            "status": payment_dto.status,
        }

        # --------------------------------------------------
        # Safe failure transition
        # --------------------------------------------------
    async def _mark_failed_if_pending(self, payment_id: int):
            db: Session = SessionLocal()
            try:
                payment = db.get(PaymentModel, payment_id)
                if payment and payment.status == PaymentStatus.pending:
                    payment.status = PaymentStatus.failed
                    db.commit()
            finally:
                db.close()
