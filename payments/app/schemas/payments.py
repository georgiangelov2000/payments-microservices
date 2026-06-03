from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class CreatePaymentRequest(BaseModel):
    order_id: int = Field(..., gt=0)
    amount: Decimal = Field(..., gt=0)
    price: Decimal = Field(..., gt=0)
    alias: str | None = Field(None, description="Optional provider alias override")
    subscription_id: UUID
    event_id: str = Field(..., min_length=1)
    idempotency_key: str | None = None
    currency: str = Field("USD", min_length=3, max_length=3)
    country: str | None = None
    billing_country: str | None = None
    card_type: str | None = None
    payment_method: str | None = None
    recurring: bool = False
    environment: str = Field("test", pattern="^(test|live)$")

    # Extended routing fields
    customer_id: str | None = Field(None, description="Customer identifier for vaulting and subscriptions")
    channel: str | None = Field(None, description="Payment channel: web, mobile, api, pos")
    locale: str | None = Field(None, description="BCP 47 locale code, e.g. en-US")
    risk_score: int | None = Field(None, ge=0, le=100, description="External fraud risk score (0=low, 100=high)")
    metadata: dict[str, Any] | None = Field(None, description="Arbitrary merchant-defined key-value pairs")

    @field_validator("amount", "price")
    @classmethod
    def validate_decimal_positive(cls, v):
        if v <= 0:
            raise ValueError("value must be greater than 0")
        return v

    @field_validator("alias", "currency", "environment", "channel")
    @classmethod
    def normalize_lowerable(cls, v):
        return v.lower() if isinstance(v, str) else v


class GetPaymentsRequest(BaseModel):
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)
