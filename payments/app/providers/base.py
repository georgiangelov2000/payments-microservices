from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class CheckoutRequest:
    payment_id: int
    merchant_id: str
    order_id: int
    amount: Decimal
    currency: str
    description: str


@dataclass(frozen=True)
class CheckoutSession:
    provider_reference: str
    payment_url: str
    raw_status: str

