import os
import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from decimal import Decimal

from app.schemas.merchants import CreateOrderRequest
from app.models import Product, Order, OrderStatus 
from app.db import SessionLocal


PAYMENTS_GATEWAY_URL = os.getenv("PAYMENTS_GATEWAY_URL")
if not PAYMENTS_GATEWAY_URL:
    raise RuntimeError("PAYMENTS_GATEWAY_URL is not set")


class Merchant:

    async def create_order(self, request: CreateOrderRequest, x_api_key: str):
        product_id = request.product_id
        quantity = request.amount
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

            if quantity <= 0 or quantity > product.stock:
                raise HTTPException(status_code=400, detail="Invalid amount requested")

            # Calculate price (Decimal)
            unit_price: Decimal = product.price
            total_price: Decimal = unit_price * quantity

            # Update stock
            product.stock -= quantity

            # Create order
            order = Order(
                product_id=product_id,
                amount=quantity,
                price=total_price,
                status=OrderStatus.pending.value,
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
                    f"{PAYMENTS_GATEWAY_URL}/api/v1/payments/create",
                    headers={"X-API-Key": x_api_key},
                    json={
                        "order_id": order.id,
                        "amount": quantity,
                        "price": str(total_price),
                        "alias": alias,
                    },
                )
            except httpx.RequestError:
                self._mark_failed(order.id)
                raise HTTPException(502, "Payment gateway unreachable")

        if resp.status_code == 401:
            self._mark_failed(order.id)
            raise HTTPException(401, "Invalid API key for payments gateway")

        if resp.status_code == 502:
            self._mark_failed(order.id)
            raise HTTPException(502, "Payment gateway error")
        
        if resp.status_code == 400:
            self._mark_failed(order.id)
            raise HTTPException(400, "Payment gateway bad request")

        # -------------------------
        # Update order status
        # -------------------------
        db = SessionLocal()
        try:
            order.status = OrderStatus.finished.value
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
                order.status = OrderStatus.failed.value
                db.commit()
        finally:
            db.close()
