from fastapi import FastAPI
from pydantic import BaseModel
import hashlib

app = FastAPI()

class GenerateUrlRequest(BaseModel):
    payment_id: int
    merchant_id: int
    provider: str


@app.post("/generate-url")
def generate_url(req: GenerateUrlRequest):
    raw = f"{req.provider}:{req.merchant_id}:{req.payment_id}"
    token = hashlib.sha256(raw.encode()).hexdigest()

    return {
        "payment_url": f"https://pay.{req.provider}.test/{token}"
    }
