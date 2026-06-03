from typing import Type

from fastapi import HTTPException

from app.providers.base import PaymentProviderAdapter, ProviderCredentials
from app.providers.paypal import PayPalConnector
from app.providers.stripe import StripeConnector

_REGISTRY: dict[str, Type] = {
    "stripe": StripeConnector,
    "paypal": PayPalConnector,
}


def provider_connector(
    alias: str,
    credentials: ProviderCredentials | None = None,
) -> PaymentProviderAdapter:
    normalized = alias.lower()
    connector_class = _REGISTRY.get(normalized)
    if connector_class is None:
        raise HTTPException(
            status_code=400,
            detail=f"Provider '{alias}' is not registered on this platform.",
        )
    return connector_class(credentials=credentials)


def registered_aliases() -> list[str]:
    return list(_REGISTRY.keys())
