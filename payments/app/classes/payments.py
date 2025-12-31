import requests
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


class Payment:
    async def create_payment(self, request: CreatePaymentRequest, api_key: str):
        db: Session = SessionLocal()
        try:
            #1 Validate API key + merchant
            api_key_row = db.execute(
                select(MerchantAPIKey)
                .where(MerchantAPIKey.hash == api_key)
            ).scalar_one_or_none()

            if not api_key_row:
                raise HTTPException(status_code=401, detail="Invalid API key")

            merchant = db.get(Merchant, api_key_row.merchant_id)
            if not merchant:
                raise HTTPException(status_code=401, detail="Merchant not found")

            #2 Validate provider by alias
            provider = db.execute(
                select(Provider)
                .where(Provider.alias == request.alias)
            ).scalar_one_or_none()

            if not provider:
                raise HTTPException(status_code=400, detail="Provider not found")

            #3 Enforce one payment per order
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

            #4 Create payment (processing)
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

            #5 Call provider container
            response = requests.post(
                "http://provider:8000/generate-url",
                json={
                    "payment_id": payment.id,
                    "merchant_id": merchant.id,
                    "provider": provider.alias,
                },
                timeout=3,
            )

            if response.status_code != 200:
                raise HTTPException(502, "Provider URL generation failed")

            payment_url = response.json()["payment_url"]

            return {
                "payment_id": payment.id,
                "status": payment.status.value,
                "payment_url": payment_url,
            }

        finally:
            db.close()

    async def webhook(self, request: PaymentWebhookRequest):
        """
        Flow:
        1) Find payment
        2) Update status based on webhook
        3) Persist terminal state
        """
        db: Session = SessionLocal()
        try:
            payment = db.get(PaymentModel, request.payment_id)

            if not payment:
                return {
                    "message": "payment not found",
                }

            # Map webhook status → internal status
            if request.status == "finished":
                payment.status = PaymentStatus.finished
            elif request.status == "failed":
                payment.status = PaymentStatus.failed
            else:
                return {
                    "message": "unsupported status",
                }

            db.commit()

            return {
                "message": "payment updated",
                "payment_id": payment.id,
                "status": payment.status.value,
            }
        finally:
            db.close()
