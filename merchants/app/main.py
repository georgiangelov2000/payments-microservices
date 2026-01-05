from fastapi import FastAPI, Header
from app.schemas.merchants import (
    CreateOrderRequest,
)
from app.classes.merchants import Merchant

app = FastAPI()

handler = Merchant()

@app.get("/ping")
async def ping():
    return {"message": "pong"}

@app.post("/orders/create")
async def create_order(
    request: CreateOrderRequest,
    x_api_key: str = Header(..., alias="X-API-Key"),
):
    return await handler.create_order(request, x_api_key)
