import os
import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.schemas.merchants import CreateOrderRequest
from app.models import Product, Order
from app.db import SessionLocal


PAYMENTS_GATEWAY_URL = os.getenv("PAYMENTS_GATEWAY_URL")
if not PAYMENTS_GATEWAY_URL:
    raise RuntimeError("PAYMENTS_GATEWAY_URL is not set")


class Merchant:

    async def create_order(self, request: CreateOrderRequest, x_api_key: str):
        product_id = request.product_id
        amount = request.amount
        alias = request.alias

        # -------------------------
        # DB: validate & create order
        # -------------------------
        db: Session = SessionLocal()
        try:
            product = db.execute(
                select(Product).where(Product.id == product_id)
            ).scalar_one_or_none()

            if not product:
                raise HTTPException(status_code=404, detail="Product not found")

            if amount <= 0 or amount > product.stock:
                raise HTTPException(status_code=400, detail="Invalid amount requested")

            order = Order(
                product_id=product_id,
                amount=amount,
                status="pending",
            )
            db.add(order)
            db.commit()
            db.refresh(order)

        finally:
            db.close()

        # -------------------------
        # Call payments gateway
        # -------------------------
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                resp = await client.post(
                    f"{PAYMENTS_GATEWAY_URL}/payments/create",
                    headers={"X-API-Key": x_api_key},
                    json={
                        "order_id": order.id,
                        "amount": amount,
                        "price": amount,
                        "alias": alias,
                    },
                )
            except httpx.RequestError:
                self._mark_failed(order.id)
                raise HTTPException(502, "Payment gateway unreachable")

        if resp.status_code != 200:
            self._mark_failed(order.id)
            raise HTTPException(502, "Payment gateway error")

        # -------------------------
        # Update order status
        # -------------------------
        db = SessionLocal()
        try:
            order.status = "completed"
            db.merge(order)
            db.commit()
        finally:
            db.close()

        return {
            "order_id": order.id,
            "payment_response": resp.json(),
        }

    def _mark_failed(self, order_id: int):
        db = SessionLocal()
        try:
            order = db.get(Order, order_id)
            if order:
                order.status = "failed"
                db.commit()
        finally:
            db.close()
