from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

MerchantMetadataValue = str | int | float | bool | None
MerchantMetadata = dict[str, MerchantMetadataValue]


class CreatePaymentRequest(BaseModel):
    order_id: int = Field(..., gt=0)
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
    customer_id: str | None = Field(
        None, description="Customer identifier for vaulting and subscriptions"
    )
    channel: str | None = Field(None, description="Payment channel: web, mobile, api, pos")
    locale: str | None = Field(None, description="BCP 47 locale code, e.g. en-US")
    risk_score: int | None = Field(
        None, ge=0, le=100, description="External fraud risk score (0=low, 100=high)"
    )
    metadata: MerchantMetadata | None = Field(
        None, description="Arbitrary merchant-defined key-value pairs"
    )

    @field_validator("price")
    @classmethod
    def validate_decimal_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("value must be greater than 0")
        return v

    @field_validator("alias", "currency", "environment", "channel", mode="before")
    @classmethod
    def normalize_lowerable(cls, v: object) -> object:
        return v.lower() if isinstance(v, str) else v


class GetPaymentsRequest(BaseModel):
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)


class PaymentCreateResponse(BaseModel):
    payment_id: str
    status: str
    provider: str | None = None
    routing_strategy: str | None = None
    routing_candidates: list[str] = Field(default_factory=list)
    provider_reference: str | None = None
    payment_url: str | None = None
    message: str | None = None


class PaymentShowResponse(BaseModel):
    payment_id: str
    order_id: int
    provider: str
    price: Decimal
    status: str
    currency: str
    country: str | None = None
    locale: str | None = None
    channel: str | None = None
    created_at: str | None = None


class PaymentListItem(BaseModel):
    payment_id: str
    order_id: int
    provider: str
    status: str
    currency: str
    country: str | None = None
    locale: str | None = None
    channel: str | None = None
    created_at: str | None = None


class PaymentListResponse(BaseModel):
    page: int
    limit: int
    total: int
    has_next: bool
    items: list[PaymentListItem]


class PaymentTrackingEvent(BaseModel):
    event_type: str
    message: str | None = None
    payload: str | None = None
    timestamp: str | None = None


class PaymentTrackingResponse(BaseModel):
    payment_id: str
    payment_status: str
    events: list[PaymentTrackingEvent]


class ProviderReturnResponse(BaseModel):
    payment_id: str
    provider: str
    status: str
    provider_status: str | None = None
