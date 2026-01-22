from fastapi import FastAPI, Header
from app.schemas.payments import CreatePaymentRequest
from app.classes.payments import Payment
from app.classes import rabbitmq

app = FastAPI()

handler = Payment()

@app.get("/api/v1/payments/ping")
def ping():
    return {"ok": True}

@app.post("/api/v1/payments")
async def create_payment(
    request: CreatePaymentRequest,
    x_merchant_id: str = Header(..., alias="X-Merchant-Id"),
):    
    return await handler.create_payment(
        request=request,
        merchant_id=x_merchant_id,
    )

@app.on_event("startup")
async def startup():
    await rabbitmq.connect()

@app.on_event("shutdown")
async def shutdown():
    await rabbitmq.close()
