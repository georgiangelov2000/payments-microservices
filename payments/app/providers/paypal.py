import os
from decimal import Decimal

import httpx
from fastapi import HTTPException

from app.providers.base import CheckoutRequest, CheckoutSession, ProviderCredentials


class PayPalConnector:
    alias = "paypal"

    _DEFAULT_SANDBOX_URL = "https://api-m.sandbox.paypal.com"
    _DEFAULT_LIVE_URL = "https://api-m.paypal.com"

    def __init__(self, credentials: ProviderCredentials | None = None):
        self._credentials = credentials
        self.return_base_url = os.getenv(
            "PAYMENT_RETURN_BASE_URL",
            "http://localhost:8080/api/v1/payments",
        ).rstrip("/")

    def _client_id(self) -> str:
        if self._credentials and self._credentials.client_id:
            return self._credentials.client_id
        raise HTTPException(
            status_code=500,
            detail="PayPal credentials are not configured for this merchant. "
                   "Please connect your PayPal account in the dashboard.",
        )

    def _client_secret(self) -> str:
        if self._credentials and self._credentials.client_secret:
            return self._credentials.client_secret
        raise HTTPException(
            status_code=500,
            detail="PayPal credentials are not configured for this merchant. "
                   "Please connect your PayPal account in the dashboard.",
        )

    def _base_url(self, environment: str) -> str:
        if self._credentials and self._credentials.base_url:
            return self._credentials.base_url.rstrip("/")
        if environment == "live":
            return self._DEFAULT_LIVE_URL
        return self._DEFAULT_SANDBOX_URL

    async def create_checkout(self, request: CheckoutRequest) -> CheckoutSession:
        base_url = self._base_url(request.environment)
        access_token = await self._access_token(base_url)
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
                f"{base_url}/v2/checkout/orders",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation",
                    "PayPal-Request-Id": request.idempotency_key,
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

    async def capture_order(self, order_id: str, environment: str = "test") -> dict:
        base_url = self._base_url(environment)
        access_token = await self._access_token(base_url)

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{base_url}/v2/checkout/orders/{order_id}/capture",
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

    async def _access_token(self, base_url: str) -> str:
        client_id = self._client_id()
        client_secret = self._client_secret()

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{base_url}/v1/oauth2/token",
                data={"grant_type": "client_credentials"},
                auth=(client_id, client_secret),
            )

        if response.status_code >= 400:
            raise HTTPException(502, detail={
                "message": "PayPal access token request failed",
                "provider_error": response.json(),
            })

        return response.json()["access_token"]
