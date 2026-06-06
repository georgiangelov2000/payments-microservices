from decimal import Decimal
from uuid import uuid4

import pytest
from app.schemas.payments import CreatePaymentRequest
from pydantic import ValidationError


def _base_payload() -> dict[str, object]:
    return {
        "order_id": 1001,
        "amount": "10.00",
        "price": "10.00",
        "subscription_id": str(uuid4()),
        "event_id": "evt_1001",
    }


def test_create_payment_request_normalizes_routing_fields() -> None:
    payload = {
        **_base_payload(),
        "alias": "Stripe",
        "currency": "USD",
        "environment": "TEST",
        "channel": "WEB",
        "metadata": {"cart_id": "cart_123"},
    }

    request = CreatePaymentRequest.model_validate(payload)

    assert request.alias == "stripe"
    assert request.currency == "usd"
    assert request.environment == "test"
    assert request.channel == "web"
    assert request.price == Decimal("10.00")


def test_create_payment_request_rejects_invalid_risk_score() -> None:
    payload = {**_base_payload(), "risk_score": 101}

    with pytest.raises(ValidationError):
        CreatePaymentRequest.model_validate(payload)
