import os
from decimal import Decimal
from typing import cast

import httpx
from fastapi import HTTPException

from app.json_types import JsonObject
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

    def _json_object(self, response: httpx.Response) -> JsonObject:
        payload = response.json()
        if not isinstance(payload, dict):
            raise HTTPException(502, detail="PayPal returned a non-object JSON response")
        return cast(JsonObject, payload)

    async def create_checkout(self, request: CheckoutRequest) -> CheckoutSession:
        base_url = self._base_url(request.environment)
        access_token = await self._access_token(base_url)
        value = Decimal(request.amount).quantize(Decimal("0.01"))
        return_url = (
            f"{self.return_base_url}/provider-return/paypal?payment_id={request.payment_id}"
        )
        cancel_url = (
            f"{self.return_base_url}/provider-return/paypal/cancel?payment_id={request.payment_id}"
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
            raise HTTPException(
                502,
                detail={
                    "message": "PayPal order creation failed",
                    "provider_error": self._json_object(response),
                },
            )

        body = self._json_object(response)
        approval_url: str | None = None
        links = body.get("links")
        if isinstance(links, list):
            for link in links:
                if not isinstance(link, dict) or link.get("rel") != "approve":
                    continue
                href = link.get("href")
                if isinstance(href, str):
                    approval_url = href
                    break

        order_id = body.get("id")
        raw_status = body.get("status")

        if not isinstance(approval_url, str):
            raise HTTPException(502, "PayPal approval URL missing")
        if not isinstance(order_id, str):
            raise HTTPException(502, "PayPal order ID missing")

        return CheckoutSession(
            provider_reference=order_id,
            payment_url=approval_url,
            raw_status=raw_status if isinstance(raw_status, str) else "CREATED",
        )

    async def capture_order(self, order_id: str, environment: str = "test") -> JsonObject:
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
            raise HTTPException(
                502,
                detail={
                    "message": "PayPal order capture failed",
                    "provider_error": self._json_object(response),
                },
            )

        return self._json_object(response)

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
            raise HTTPException(
                502,
                detail={
                    "message": "PayPal access token request failed",
                    "provider_error": self._json_object(response),
                },
            )

        payload = self._json_object(response)
        access_token = payload.get("access_token")
        if not isinstance(access_token, str):
            raise HTTPException(502, "PayPal access token missing")
        return access_token
