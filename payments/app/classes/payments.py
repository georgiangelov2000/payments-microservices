import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.schemas.payments import (
    CreatePaymentRequest,
    PaymentWebhookRequest,
)
from app.models import (
    MerchantAPIKey,
    Merchant,
    Provider,
    Payment as PaymentModel,
    PaymentStatus,
)
from app.db import SessionLocal
from app.classes import rabbitmq


class Payment:
    """
    Handles payment lifecycle:
    - create payment
    - provider interaction
    - webhook updates
    - event publishing
    """

    # -------------------------------------------------
    # Create payment
    # -------------------------------------------------
    async def create_payment(self, request: CreatePaymentRequest, api_key: str):
        """
        Flow:
        1) Validate API key & merchant
        2) Validate provider
        3) Enforce one payment per order
        4) Create payment (pending)
        5) Call provider
        6) Publish RabbitMQ event
        """

        # -------------------------
        # DB: validate & create
        # -------------------------
        db: Session = SessionLocal()
        try:
            # 1. Validate API key
            api_key_row = db.execute(
                select(MerchantAPIKey)
                .where(MerchantAPIKey.hash == api_key)
            ).scalar_one_or_none()

            if not api_key_row:
                raise HTTPException(status_code=401, detail="Invalid API key")

            merchant = db.get(Merchant, api_key_row.merchant_id)
            if not merchant:
                raise HTTPException(status_code=401, detail="Merchant not found")

            # 2. Validate provider
            provider = db.execute(
                select(Provider)
                .where(Provider.alias == request.alias)
            ).scalar_one_or_none()

            if not provider:
                raise HTTPException(status_code=400, detail="Provider not found")

            # 3. Enforce one payment per order
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

            # 4. Create payment
            payment = PaymentModel(
                order_id=request.order_id,
                amount=request.amount,
                price=request.price,
                merchant_id=merchant.id,
                status=PaymentStatus.pending,
            )

            db.add(payment)
            db.commit()
            db.refresh(payment)

        finally:
            db.close()

        # -------------------------
        # Call provider (ASYNC)
        # -------------------------
        async with httpx.AsyncClient(timeout=3.0) as client:
            try:
                resp = await client.post(
                    "http://provider:8000/generate-url",
                    json={
                        "payment_id": payment.id,
                        "merchant_id": merchant.id,
                        "provider": provider.alias,
                    },
                )
            except httpx.RequestError:
                await self._mark_failed(payment.id)
                raise HTTPException(
                    status_code=502,
                    detail="Provider unreachable",
                )

        if resp.status_code != 200:
            await self._mark_failed(payment.id)
            raise HTTPException(
                status_code=502,
                detail="Provider URL generation failed",
            )

        payment_url = resp.json().get("payment_url")

        # -------------------------
        # Publish event (payment.pending)
        # -------------------------
        await rabbitmq.publish_payment_event(payment)

        return {
            "payment_id": payment.id,
            "status": payment.status.value,
            "payment_url": payment_url,
        }

    # -------------------------------------------------
    # Webhook
    # -------------------------------------------------
    async def webhook(self, request: PaymentWebhookRequest):
        """
        Flow:
        1) Find payment
        2) Update status
        3) Publish event
        """

        db: Session = SessionLocal()
        try:
            payment = db.get(PaymentModel, request.payment_id)

            if not payment:
                return {"message": "payment not found"}

            if request.status == "finished":
                payment.status = PaymentStatus.finished
            elif request.status == "failed":
                payment.status = PaymentStatus.failed
            else:
                return {"message": "unsupported status"}

            db.commit()

        finally:
            db.close()

        # Publish terminal event
        await rabbitmq.publish_payment_event(payment)

        return {
            "message": "payment updated",
            "payment_id": payment.id,
            "status": payment.status.value,
        }

    # -------------------------------------------------
    # Internal helper
    # -------------------------------------------------
    async def _mark_failed(self, payment_id: int):
        """
        Marks payment as failed (used on provider errors)
        """
        db = SessionLocal()
        try:
            payment = db.get(PaymentModel, payment_id)
            if payment:
                payment.status = PaymentStatus.failed
                db.commit()
        finally:
            db.close()
