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
)
from app.db import SessionLocal
from app.classes import rabbitmq
from app.dto.payments import PaymentDTO


class Payment:
    """
    Handles payment lifecycle:
    - create payment
    - provider interaction
    - webhook updates
    - event publishing (ONLY via webhook)
    """

    # --------------------------------------------------
    # Create payment
    # --------------------------------------------------
    async def create_payment(self, request: CreatePaymentRequest, merchant_id: str):
        db: Session = SessionLocal()

        try:
            provider = db.execute(
                select(Provider).where(Provider.alias == request.alias)
            ).scalar_one_or_none()

            if not provider:
                raise HTTPException(status_code=400, detail="Provider not found")

            # Explicit idempotency check
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

            payment = PaymentModel(
                order_id=request.order_id,
                amount=request.amount,
                price=request.price,
                provider_id=provider.id,
                merchant_id=merchant_id,
                status=PaymentStatus.pending,
            )

            db.add(payment)
            db.commit()
            db.refresh(payment)

            payment_id = payment.id
            provider_alias = provider.alias

        finally:
            db.close()

        # Call provider AFTER payment is committed
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

            # Idempotency guard
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

        # Publish AFTER commit
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
