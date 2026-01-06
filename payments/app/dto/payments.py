from pydantic import BaseModel


class PaymentDTO(BaseModel):
    payment_id: int
    order_id: int
    merchant_id: int
    status: str
    amount: str
    price: str

