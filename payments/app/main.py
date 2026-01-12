from fastapi import FastAPI, Header
from app.schemas.payments import (
    CreatePaymentRequest,
    PaymentWebhookRequest,
)
from app.classes.payments import Payment
from app.classes import rabbitmq

app = FastAPI()

handler = Payment()

@app.get("/payments/ping")
def ping():
    return {"ok": True}

@app.post("/payments")
async def create_payment(
    request: CreatePaymentRequest,
    x_merchant_id: str = Header(..., alias="X-Merchant-Id"),
):    
    return await handler.create_payment(
        request=request,
        merchant_id=x_merchant_id,
    )

@app.post("/payments/webhook")
async def webhook(request: PaymentWebhookRequest):
    return await handler.webhook(request)

@app.on_event("startup")
async def startup():
    await rabbitmq.connect()

@app.on_event("shutdown")
async def shutdown():
    await rabbitmq.close()
