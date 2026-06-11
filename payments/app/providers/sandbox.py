import os

from app.json_types import JsonObject
from app.providers.base import CheckoutRequest, CheckoutSession


class SandboxConnector:
    alias = "sandbox"

    def __init__(self, credentials=None):
        self.return_base_url = os.getenv(
            "PAYMENT_RETURN_BASE_URL",
            "http://localhost:8080/api/v1/payments",
        ).rstrip("/")

    async def create_checkout(self, request: CheckoutRequest) -> CheckoutSession:
        payment_url = (
            f"{self.return_base_url}/provider-return/sandbox"
            f"?payment_id={request.payment_id}&result=success"
        )

        return CheckoutSession(
            provider_reference=f"sandbox_{request.payment_id}",
            payment_url=payment_url,
            raw_status="created",
        )

    async def retrieve_checkout_session(self, result: str = "success") -> JsonObject:
        return {
            "id": "sandbox-session",
            "status": "complete" if result == "success" else "failed",
            "payment_status": "paid" if result == "success" else "failed",
            "provider": "sandbox",
        }
