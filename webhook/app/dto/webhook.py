from pydantic import BaseModel


class webhookDTO(BaseModel):
    payment_id: int
    order_id: int
    merchant_id: int
    status: str
    amount: str
    price: str

