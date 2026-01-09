import hashlib
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import ProviderPayment
from app.schemas.providers import GenerateUrlRequest


class ProviderService:

    async def generate_url(self, request: GenerateUrlRequest) -> dict:
        """
        Flow:
        1) Generate deterministic token
        2) Check if payment already exists
        3) If exists → return stored URL
        4) Else → persist and return new URL
        """

        raw = f"{request.provider}:{request.merchant_id}:{request.payment_id}"
        token = hashlib.sha256(raw.encode()).hexdigest()
        payment_url = f"https://pay.{request.provider}.test/{token}"

        db: Session = SessionLocal()
        try:
            # Idempotency check (payment_id + provider)
            existing = db.execute(
                select(ProviderPayment).where(
                    ProviderPayment.payment_id == request.payment_id,
                    ProviderPayment.provider == request.provider,
                )
            ).scalar_one_or_none()

            print("Existing payment check:", existing)
            if existing:
                return {
                    "payment_url": existing.payment_url,
                }

            provider_payment = ProviderPayment(
                payment_id=request.payment_id,
                merchant_id=request.merchant_id,
                provider=request.provider,
                token=token,
                payment_url=payment_url,
            )

            db.add(provider_payment)
            db.commit()

            return {
                "payment_url": payment_url,
            }

        finally:
            db.close()
