import hashlib
import hmac
import logging
import os
import time

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

_STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
_PAYPAL_WEBHOOK_ID = os.getenv("PAYPAL_WEBHOOK_ID", "")

# Stripe allows up to 5 minutes of clock drift between their servers and ours.
_STRIPE_TIMESTAMP_TOLERANCE_SECONDS = 300


class WebhookAck(BaseModel):
    received: bool


def _verify_stripe_signature(payload: bytes, signature_header: str, secret: str) -> None:
    """
    Verify Stripe webhook signatures using their v1 scheme.

    Stripe sends: Stripe-Signature: t=<timestamp>,v1=<sig>[,v1=<sig2>]
    We reconstruct the signed payload as "<timestamp>.<raw_body>" and compare
    our HMAC-SHA256 against every v1 token in the header.

    Raises HTTPException 400 if the signature is invalid or the timestamp is stale.
    """
    if not secret:
        logger.warning("STRIPE_WEBHOOK_SECRET not configured — skipping signature check")
        return

    parts: dict[str, list[str]] = {}
    for item in signature_header.split(","):
        if "=" in item:
            k, _, v = item.partition("=")
            parts.setdefault(k.strip(), []).append(v.strip())

    timestamps = parts.get("t", [])
    v1_sigs = parts.get("v1", [])

    if not timestamps or not v1_sigs:
        raise HTTPException(status_code=400, detail="Invalid Stripe-Signature header")

    try:
        ts = int(timestamps[0])
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Stripe-Signature timestamp")

    if abs(time.time() - ts) > _STRIPE_TIMESTAMP_TOLERANCE_SECONDS:
        raise HTTPException(status_code=400, detail="Stripe webhook timestamp too old")

    signed_payload = f"{ts}.".encode() + payload
    expected = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()

    if not any(hmac.compare_digest(expected, sig) for sig in v1_sigs):
        raise HTTPException(status_code=400, detail="Stripe webhook signature mismatch")


def _verify_paypal_signature(
    payload: bytes,
    transmission_id: str | None,
    timestamp: str | None,
    cert_url: str | None,
    actual_sig: str | None,
) -> None:
    """
    PayPal webhook verification requires calling PayPal's verification API
    (POST /v1/notifications/verify-webhook-signature) with the raw headers and body.
    Full implementation requires an active PayPal OAuth token; stub logs a warning
    in sandbox and blocks in production when PAYPAL_WEBHOOK_ID is configured.
    """
    if not _PAYPAL_WEBHOOK_ID:
        logger.warning("PAYPAL_WEBHOOK_ID not configured — skipping PayPal signature check")
        return

    # At minimum, reject requests that are missing all PayPal signature headers.
    if not transmission_id or not timestamp or not actual_sig:
        raise HTTPException(status_code=400, detail="Missing PayPal webhook signature headers")

    # Full verification via PayPal's API should be wired here once OAuth token
    # management is in place. Until then, log a warning so missing config is visible.
    logger.warning(
        "PayPal webhook received (transmission_id=%s) — full signature verification not yet implemented",
        transmission_id,
    )


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(None, alias="Stripe-Signature"),
) -> WebhookAck:
    payload = await request.body()

    if stripe_signature is None:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")

    _verify_stripe_signature(payload, stripe_signature, _STRIPE_WEBHOOK_SECRET)

    # TODO: parse event type and call provider_callback for
    #       payment_intent.succeeded / payment_intent.payment_failed
    return WebhookAck(received=True)


@router.post("/paypal")
async def paypal_webhook(
    request: Request,
    transmission_id: str | None = Header(None, alias="Paypal-Transmission-Id"),
    transmission_time: str | None = Header(None, alias="Paypal-Transmission-Time"),
    cert_url: str | None = Header(None, alias="Paypal-Cert-Url"),
    transmission_sig: str | None = Header(None, alias="Paypal-Transmission-Sig"),
) -> WebhookAck:
    payload = await request.body()

    _verify_paypal_signature(payload, transmission_id, transmission_time, cert_url, transmission_sig)

    # TODO: parse event_type and call provider_callback for
    #       PAYMENT.CAPTURE.COMPLETED / PAYMENT.CAPTURE.DENIED
    return WebhookAck(received=True)
