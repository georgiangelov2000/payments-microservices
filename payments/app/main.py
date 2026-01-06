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

@app.post("/payments/create")
async def create_payment(
    request: CreatePaymentRequest,
    x_api_key: str = Header(..., alias="X-API-Key"),
):
    return await handler.create_payment(request, x_api_key)

@app.post("/payments/webhook")
async def webhook(request: PaymentWebhookRequest):
    return await handler.webhook(request)

@app.on_event("startup")
async def startup():
    await rabbitmq.connect()

@app.on_event("shutdown")
async def shutdown():
    await rabbitmq.close()
