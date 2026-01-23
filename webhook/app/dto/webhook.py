from pydantic import BaseModel


class WebhookDTO(BaseModel):
    payment_id: int
    order_id: int
    merchant_id: int
    status: int
    amount: str
    price: str
