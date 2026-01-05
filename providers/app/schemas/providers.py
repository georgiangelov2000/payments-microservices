from pydantic import BaseModel

class GenerateUrlRequest(BaseModel):
    payment_id: int
    merchant_id: int
    provider: str
