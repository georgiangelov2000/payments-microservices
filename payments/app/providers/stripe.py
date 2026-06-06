import os
from decimal import ROUND_HALF_UP, Decimal
from typing import cast

import httpx
from fastapi import HTTPException

from app.json_types import JsonObject
from app.providers.base import CheckoutRequest, CheckoutSession, ProviderCredentials


class StripeConnector:
    alias = "stripe"

    def __init__(self, credentials: ProviderCredentials | None = None):
        self._credentials = credentials
        self.return_base_url = os.getenv(
            "PAYMENT_RETURN_BASE_URL",
            "http://localhost:8080/api/v1/payments",
        ).rstrip("/")

    def _secret_key(self) -> str:
        if self._credentials and self._credentials.secret_key:
            return self._credentials.secret_key
        raise HTTPException(
            status_code=500,
            detail="Stripe credentials are not configured for this merchant. "
            "Please connect your Stripe account in the dashboard.",
        )

    def _json_object(self, response: httpx.Response) -> JsonObject:
        payload = response.json()
        if not isinstance(payload, dict):
            raise HTTPException(502, detail="Stripe returned a non-object JSON response")
        return cast(JsonObject, payload)

    async def create_checkout(self, request: CheckoutRequest) -> CheckoutSession:
        secret_key = self._secret_key()
        unit_amount = int(
            (Decimal(request.amount) * Decimal("100")).quantize(
                Decimal("1"),
                rounding=ROUND_HALF_UP,
            )
        )

        success_url = (
            f"{self.return_base_url}/provider-return/stripe"
            f"?payment_id={request.payment_id}&session_id={{CHECKOUT_SESSION_ID}}"
        )
        cancel_url = (
            f"{self.return_base_url}/provider-return/stripe/cancel"
            f"?payment_id={request.payment_id}&session_id={{CHECKOUT_SESSION_ID}}"
        )

        data = {
            "mode": "payment",
            "success_url": success_url,
            "cancel_url": cancel_url,
            "client_reference_id": str(request.payment_id),
            "metadata[payment_id]": str(request.payment_id),
            "metadata[merchant_id]": str(request.merchant_id),
            "line_items[0][quantity]": "1",
            "line_items[0][price_data][currency]": request.currency.lower(),
            "line_items[0][price_data][unit_amount]": str(unit_amount),
            "line_items[0][price_data][product_data][name]": request.description,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.stripe.com/v1/checkout/sessions",
                data=data,
                headers={"Idempotency-Key": request.idempotency_key},
                auth=(secret_key, ""),
            )

        if response.status_code >= 400:
            raise HTTPException(
                502,
                detail={
                    "message": "Stripe checkout session creation failed",
                    "provider_error": self._json_object(response),
                },
            )

        payload = self._json_object(response)
        session_id = payload.get("id")
        payment_url = payload.get("url")

        if not isinstance(session_id, str) or not isinstance(payment_url, str):
            raise HTTPException(502, detail="Stripe checkout response is missing id or url")

        raw_status = payload.get("payment_status")
        return CheckoutSession(
            provider_reference=session_id,
            payment_url=payment_url,
            raw_status=raw_status if isinstance(raw_status, str) else "unpaid",
        )

    async def retrieve_checkout_session(self, session_id: str) -> JsonObject:
        secret_key = self._secret_key()

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"https://api.stripe.com/v1/checkout/sessions/{session_id}",
                auth=(secret_key, ""),
            )

        if response.status_code >= 400:
            raise HTTPException(
                502,
                detail={
                    "message": "Stripe checkout session lookup failed",
                    "provider_error": self._json_object(response),
                },
            )

        return self._json_object(response)
