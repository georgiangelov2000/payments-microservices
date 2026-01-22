from typing import Optional
from fastapi import FastAPI, Header, HTTPException

from app.schemas.webhook import PaymentWebhookRequest
from app.classes.webhook import Webhook

app = FastAPI()

webhook_handler = Webhook()

@app.post("/api/v1/payments/webhook")
async def webhook(
    payload: PaymentWebhookRequest,
    x_provider_signature: Optional[str] = Header(default=None),
):
    """
    Provider → Payments webhook endpoint
    """


    result = await webhook_handler.handle(
        payload=payload,
        x_provider_signature=x_provider_signature,
    )

    return {
        "status": "ok",
        "result": result,
    }
