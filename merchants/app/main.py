import os
import httpx
from fastapi import FastAPI, HTTPException

from app.db import SessionLocal, engine
from app.models import Base, Product, Order

Base.metadata.create_all(bind=engine)

app = FastAPI()

PAYMENTS_GATEWAY_URL = os.getenv("PAYMENTS_GATEWAY_URL")
MERCHANT_API_KEY = os.getenv("MERCHANT_API_KEY")

@app.get("/ping")
async def ping():
    return {"message": "pong"}

@app.post("/orders/create")
async def create_order(product_id: int, amount: float):
    db = SessionLocal()
    try:
        order = Order(product_id=product_id, amount=amount)
        db.add(order)
        db.commit()
        db.refresh(order)

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{PAYMENTS_GATEWAY_URL}/payments/create",
                headers={
                    "X-API-Key": MERCHANT_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "order_id": order.id,
                    "amount": amount,
                    "price": amount,
                    "alias": "stripe",
                },
                timeout=5,
            )

        if resp.status_code != 200:
            raise HTTPException(502, "Payment gateway error")

        order.status = "payment_created"
        db.commit()

        return {
            "order_id": order.id,
            "payment_response": resp.json(),
        }

    finally:
        db.close()
