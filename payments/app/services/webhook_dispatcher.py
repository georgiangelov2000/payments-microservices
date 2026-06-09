import hashlib
import hmac
import json
import logging
import time
from datetime import datetime, timezone
from uuid import UUID

import httpx
from sqlalchemy import select

from app.db.context import payments_session
from app.models.payments import MerchantWebhook, Payment, WebhookDelivery
from app.support.uuid import uuid7

logger = logging.getLogger(__name__)

_TIMEOUT = 10.0

_WEBHOOK_EVENT_MAP = {
    "payment.created": "created",
    "payment.succeeded": "succeeded",
    "payment.failed": "failed",
    "payment.cancelled": "cancelled",
    "payment.pending": "pending",
}


class WebhookDispatcher:
    """
    Fires signed HTTP POST requests to merchant webhook endpoints after payment events.

    Called by the Python payment service after each terminal status transition.
    Reads merchant_webhooks config from the shared DB, delivers the payload, and
    writes the outcome to webhook_deliveries for display in the saas-laravel UI.
    """

    async def dispatch(self, merchant_id: UUID, event: str, payment: Payment) -> None:
        with payments_session() as db:
            rows = db.execute(
                select(MerchantWebhook).where(
                    MerchantWebhook.merchant_id == merchant_id,
                    MerchantWebhook.active.is_(True),
                )
            ).scalars().all()
            webhooks = list(rows)

        targets = [
            w for w in webhooks
            if isinstance(w.events, list) and event in w.events
        ]

        for webhook in targets:
            try:
                await self._fire(webhook, event, payment)
            except Exception as exc:
                logger.warning("Unexpected webhook dispatch error (webhook=%s): %s", webhook.id, exc)

    async def _fire(self, webhook: MerchantWebhook, event: str, payment: Payment) -> None:
        payload = _build_payload(event, payment)
        body = json.dumps(payload, separators=(",", ":"))
        timestamp = int(time.time())
        sig = _sign(str(webhook.secret), timestamp, body)
        delivery_id = uuid7()

        with payments_session() as db:
            db.add(WebhookDelivery(
                id=delivery_id,
                webhook_id=webhook.id,
                payment_id=payment.id,
                event=event,
                payload=payload,
                status="pending",
                attempts=0,
            ))
            db.commit()

        success = False
        response_code: int | None = None
        response_body: str | None = None
        last_error: str | None = None

        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                resp = await client.post(
                    str(webhook.url),
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-PayFlow-Event": event,
                        "X-PayFlow-Signature": f"t={timestamp},v1={sig}",
                        "X-PayFlow-Delivery": str(delivery_id),
                    },
                )
            success = resp.is_success
            response_code = resp.status_code
            response_body = resp.text[:512]
            if not success:
                last_error = f"HTTP {resp.status_code}: {resp.text[:256]}"
        except httpx.TimeoutException:
            last_error = f"Request timed out after {_TIMEOUT}s"
        except Exception as exc:
            last_error = str(exc)[:500]

        now = datetime.now(timezone.utc)
        with payments_session() as db:
            db.execute(
                WebhookDelivery.__table__.update()
                .where(WebhookDelivery.id == delivery_id)
                .values(
                    status="delivered" if success else "failed",
                    attempts=1,
                    response_code=response_code,
                    response_body=response_body,
                    last_error=last_error,
                    delivered_at=now if success else None,
                )
            )
            if success:
                db.execute(
                    MerchantWebhook.__table__.update()
                    .where(MerchantWebhook.id == webhook.id)
                    .values(last_used_at=now)
                )
            db.commit()

        if success:
            logger.info("Webhook delivered (delivery=%s, event=%s, url=%s)", delivery_id, event, webhook.url)
        else:
            logger.warning(
                "Webhook delivery failed (delivery=%s, event=%s, url=%s): %s",
                delivery_id, event, webhook.url, last_error,
            )


def _build_payload(event: str, payment: Payment) -> dict:
    return {
        "id": str(uuid7()),
        "event": event,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "data": {
            "payment_id": str(payment.id),
            "order_id": str(payment.order_id),
            "status": _WEBHOOK_EVENT_MAP.get(event, event),
            "amount": float(payment.price) if payment.price is not None else None,
            "currency": payment.currency,
            "provider_reference": payment.provider_reference,
            "environment": payment.environment,
            "created_at": payment.created_at.isoformat() if payment.created_at else None,
        },
    }


def _sign(secret: str, timestamp: int, payload: str) -> str:
    msg = f"{timestamp}.{payload}".encode()
    return hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()
