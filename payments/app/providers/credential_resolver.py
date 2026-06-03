import json
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.payments import MerchantProviderCredential, Provider
from app.providers.base import ProviderCredentials


class CredentialResolver:
    """Resolves per-merchant, per-environment provider credentials from the database.

    Each merchant connects their own provider accounts (e.g. their own Stripe secret key).
    This resolver fetches those credentials at runtime so providers never use shared
    platform-level keys.
    """

    def resolve(
        self,
        db: Session,
        merchant_id: UUID,
        provider_alias: str,
        environment: str,
    ) -> ProviderCredentials:
        row = db.execute(
            select(MerchantProviderCredential)
            .join(Provider, Provider.id == MerchantProviderCredential.provider_id)
            .where(
                MerchantProviderCredential.merchant_id == merchant_id,
                Provider.alias == provider_alias.lower(),
                MerchantProviderCredential.environment == environment,
                MerchantProviderCredential.status.in_(["active", "validated"]),
            )
        ).scalar_one_or_none()

        if not row or not row.secret_value:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": (
                        f"No active credentials configured for provider '{provider_alias}' "
                        f"in '{environment}' environment. "
                        "Please connect this provider in your dashboard before processing payments."
                    ),
                    "provider": provider_alias,
                    "environment": environment,
                },
            )

        return self._parse(row.secret_value)

    def _parse(self, secret_value: str) -> ProviderCredentials:
        try:
            data = json.loads(secret_value)
            if not isinstance(data, dict):
                raise ValueError("credentials must be a JSON object")
        except (json.JSONDecodeError, ValueError):
            # Plain string = Stripe-style single secret key
            data = {"secret_key": secret_value}

        return ProviderCredentials(
            secret_key=data.get("secret_key"),
            client_id=data.get("client_id"),
            client_secret=data.get("client_secret"),
            base_url=data.get("base_url"),
            extra={k: v for k, v in data.items() if k not in {"secret_key", "client_id", "client_secret", "base_url"}},
        )
