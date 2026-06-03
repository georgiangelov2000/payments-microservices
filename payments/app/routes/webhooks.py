from fastapi import APIRouter, Header, Request

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
):
    payload = await request.body()
    # TODO: verify signature using STRIPE_WEBHOOK_SECRET
    # TODO: handle event types: payment_intent.succeeded, payment_intent.payment_failed
    return {"received": True}


@router.post("/paypal")
async def paypal_webhook(request: Request):
    payload = await request.json()
    # TODO: verify PayPal webhook signature
    # TODO: handle event types: PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED
    return {"received": True}
