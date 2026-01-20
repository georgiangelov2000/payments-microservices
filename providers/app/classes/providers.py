import httpx
import hashlib
import hmac
import os
import json

from fastapi import HTTPException
from sqlalchemy import select, update
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

    async def accept_payment(self, token: str) -> dict:
        db: Session = SessionLocal()

        webhook_url = os.getenv("PAYMENT_URL_BASE_WEBHOOK")
        secret = os.getenv("INTERNAL_WEBHOOK_SECRET")

        if not secret:
            raise RuntimeError("INTERNAL_WEBHOOK_SECRET is not set")

        try:
            # Atomic state transition (race-safe)
            result = db.execute(
                update(ProviderPayment)
                .where(
                    ProviderPayment.token == token,
                    ProviderPayment.status == "pending",
                )
                .values(status="finished")
                .returning(
                    ProviderPayment.payment_id,
                    ProviderPayment.status,
                )
            )

            row = result.fetchone()

            if not row:
                raise HTTPException(
                    status_code=409,
                    detail="Payment already processed or invalid state",
                )

            db.commit()

            payload = {
                "payment_id": row.payment_id,
                "status": row.status,
            }

            # --------------------------------------------------
            # Sign webhook payload (HMAC-SHA256)
            # --------------------------------------------------
            payload_json = json.dumps(
                payload,
                separators=(",", ":"),
                sort_keys=True,
            )

            signature = hmac.new(
                secret.encode(),
                payload_json.encode(),
                hashlib.sha256,
            ).hexdigest()

            headers = {
                "Content-Type": "application/json",
                "X-Internal-Signature": signature,
            }

            print(webhook_url)

            # Send webhook
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    webhook_url,
                    content=payload_json,  # IMPORTANT: raw JSON string
                    headers=headers,
                )

            return payload

        finally:
            db.close()
