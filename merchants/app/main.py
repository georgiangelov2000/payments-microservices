from fastapi import FastAPI, Header
from app.schemas.merchants import (
    CreateOrderRequest,
    WebhookOrderResponse
)
from app.classes.merchants import Merchant

app = FastAPI()

handler = Merchant()

@app.get("/api/v1/ping")
async def ping():
    return {"message": "pong"}

@app.post("/api/v1/orders/create")
async def create_order(
    request: CreateOrderRequest,
    x_api_key: str = Header(..., alias="X-API-Key"),
):
    return await handler.create_order(request, x_api_key)

@app.post("/api/v1/orders/webhook")
async def webhook_order_status (
    request: WebhookOrderResponse,
):
    return await handler.webhook_order_status(request)