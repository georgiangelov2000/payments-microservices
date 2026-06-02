from fastapi import HTTPException

from app.providers.paypal import PayPalConnector
from app.providers.stripe import StripeConnector


def provider_connector(alias: str):
    normalized = alias.lower()

    if normalized == "stripe":
        return StripeConnector()

    if normalized == "paypal":
        return PayPalConnector()

    raise HTTPException(
        status_code=400,
        detail=f"Provider '{alias}' is not available for sandbox checkout",
    )

