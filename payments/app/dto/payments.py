from pydantic import BaseModel


class PaymentDTO(BaseModel):
    payment_id: str
    order_id: int
    merchant_id: str
    status: int
    amount: str
    price: str
