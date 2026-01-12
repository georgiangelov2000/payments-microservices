from fastapi import FastAPI
from app.classes.providers import ProviderService
from app.schemas.providers import GenerateUrlRequest

app = FastAPI()
service = ProviderService()

# Resource: payment-links
@app.post("/payment-links")
async def create_payment_link(req: GenerateUrlRequest):
    return await service.generate_url(req)

# Resource: payments
@app.post("/payments/{token}/accept")
async def accept_payment(token: str):
    return await service.accept_payment(token)
