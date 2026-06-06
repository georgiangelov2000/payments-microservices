from fastapi import APIRouter, Header, Request
from pydantic import BaseModel

from app.json_types import JsonObject

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


class WebhookAck(BaseModel):
    received: bool


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(None, alias="Stripe-Signature"),
) -> WebhookAck:
    _payload = await request.body()
    _signature = stripe_signature
    # TODO: verify signature using STRIPE_WEBHOOK_SECRET
    # TODO: handle event types: payment_intent.succeeded, payment_intent.payment_failed
    return WebhookAck(received=True)


@router.post("/paypal")
async def paypal_webhook(request: Request) -> WebhookAck:
    _payload: JsonObject = await request.json()
    # TODO: verify PayPal webhook signature
    # TODO: handle event types: PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED
    return WebhookAck(received=True)
