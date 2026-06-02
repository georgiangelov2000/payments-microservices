import os
from decimal import Decimal

import httpx
from fastapi import HTTPException

from app.providers.base import CheckoutRequest, CheckoutSession


class PayPalConnector:
    def __init__(self):
        self.client_id = os.getenv("PAYPAL_CLIENT_ID")
        self.client_secret = os.getenv("PAYPAL_CLIENT_SECRET")
        self.base_url = os.getenv(
            "PAYPAL_API_BASE_URL",
            "https://api-m.sandbox.paypal.com",
        ).rstrip("/")
        self.return_base_url = os.getenv(
            "PAYMENT_RETURN_BASE_URL",
            "http://localhost:8080/api/v1/payments",
        ).rstrip("/")

    async def create_checkout(self, request: CheckoutRequest) -> CheckoutSession:
        access_token = await self._access_token()
        value = Decimal(request.amount).quantize(Decimal("0.01"))
        return_url = (
            f"{self.return_base_url}/provider-return/paypal"
            f"?payment_id={request.payment_id}"
        )
        cancel_url = (
            f"{self.return_base_url}/provider-return/paypal/cancel"
            f"?payment_id={request.payment_id}"
        )

        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": str(request.payment_id),
                    "description": request.description,
                    "custom_id": str(request.payment_id),
                    "amount": {
                        "currency_code": request.currency.upper(),
                        "value": str(value),
                    },
                }
            ],
            "application_context": {
                "return_url": return_url,
                "cancel_url": cancel_url,
                "user_action": "PAY_NOW",
                "shipping_preference": "NO_SHIPPING",
            },
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{self.base_url}/v2/checkout/orders",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation",
                },
                json=payload,
            )

        if response.status_code >= 400:
            raise HTTPException(502, detail={
                "message": "PayPal order creation failed",
                "provider_error": response.json(),
            })

        body = response.json()
        approval_url = next(
            (
                link["href"]
                for link in body.get("links", [])
                if link.get("rel") == "approve"
            ),
            None,
        )

        if not approval_url:
            raise HTTPException(502, "PayPal approval URL missing")

        return CheckoutSession(
            provider_reference=body["id"],
            payment_url=approval_url,
            raw_status=body.get("status", "CREATED"),
        )

    async def capture_order(self, order_id: str) -> dict:
        access_token = await self._access_token()

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{self.base_url}/v2/checkout/orders/{order_id}/capture",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation",
                },
            )

        if response.status_code >= 400:
            raise HTTPException(502, detail={
                "message": "PayPal order capture failed",
                "provider_error": response.json(),
            })

        return response.json()

    async def _access_token(self) -> str:
        if not self.client_id or not self.client_secret:
            raise HTTPException(500, "PayPal client ID or secret is not configured")

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{self.base_url}/v1/oauth2/token",
                data={"grant_type": "client_credentials"},
                auth=(self.client_id, self.client_secret),
            )

        if response.status_code >= 400:
            raise HTTPException(502, detail={
                "message": "PayPal access token request failed",
                "provider_error": response.json(),
            })

        return response.json()["access_token"]

