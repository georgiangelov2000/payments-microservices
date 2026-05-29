from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy import select

from app.classes.providers import ProviderService
from app.schemas.providers import GenerateUrlRequest
from app.db import SessionLocal
from app.models import ProviderPayment
from app.payment_page import render

app = FastAPI()
service = ProviderService()


@app.post("/payment-links")
async def create_payment_link(req: GenerateUrlRequest):
    return await service.generate_url(req)


@app.post("/payments/{token}/accept")
async def accept_payment(token: str):
    return await service.accept_payment(token)


@app.get("/pay/{token}", response_class=HTMLResponse)
async def payment_page(token: str):
    db = SessionLocal()
    try:
        row = db.execute(
            select(
                ProviderPayment.payment_id,
                ProviderPayment.provider,
                ProviderPayment.status,
            ).where(ProviderPayment.token == token)
        ).first()
    finally:
        db.close()

    if not row:
        raise HTTPException(status_code=404, detail="Payment link not found")

    if row.status != "pending":
        raise HTTPException(status_code=409, detail="Payment already processed")

    return HTMLResponse(content=render(token, row.provider, row.payment_id))
