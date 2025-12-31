from pydantic import BaseModel, Field, field_validator
from decimal import Decimal

class CreatePaymentRequest(BaseModel):
    order_id: int = Field(..., gt=0, description="order_id must be a positive integer")
    amount: Decimal = Field(..., gt=0, description="amount must be greater than 0")
    price: Decimal = Field(..., gt=0, description="price must be greater than 0")
    alias: str = Field(..., min_length=1, description="alias is required")

    @field_validator("amount", "price")
    @classmethod
    def validate_decimal_positive(cls, v):
        if v <= 0:
            raise ValueError("value must be greater than 0")
        return v


class PaymentWebhookRequest(BaseModel):
    payment_id: int = Field(..., gt=0, description="payment_id must be a positive integer")
    status: str = Field(..., min_length=1, description="status is required")
    provider_reference: str = Field(..., min_length=1, description="provider_reference is required")
