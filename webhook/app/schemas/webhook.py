from pydantic import BaseModel, Field

class PaymentWebhookRequest(BaseModel):
    payment_id: int = Field(..., gt=0, description="payment_id must be a positive integer")
    status: str = Field(..., min_length=1, description="status is required")
