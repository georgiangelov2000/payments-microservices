from dataclasses import dataclass, field
from decimal import Decimal
from typing import Protocol


@dataclass(frozen=True)
class ProviderCredentials:
    """Resolved per-merchant, per-environment provider credentials."""
    secret_key: str | None = None       # Stripe secret key
    client_id: str | None = None         # PayPal client ID
    client_secret: str | None = None     # PayPal client secret
    base_url: str | None = None          # Optional API base URL override
    extra: dict = field(default_factory=dict)


@dataclass(frozen=True)
class CheckoutRequest:
    payment_id: str
    merchant_id: str
    order_id: int
    amount: Decimal
    currency: str
    description: str
    idempotency_key: str
    environment: str
    credentials: ProviderCredentials | None = None


@dataclass(frozen=True)
class CheckoutSession:
    provider_reference: str
    payment_url: str
    raw_status: str


class PaymentProviderAdapter(Protocol):
    alias: str

    async def create_checkout(self, request: CheckoutRequest) -> CheckoutSession:
        ...
