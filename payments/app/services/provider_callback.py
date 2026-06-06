import json
from datetime import datetime
from uuid import UUID

from fastapi import HTTPException

from app.db.context import logs_session, payments_session
from app.enums import LogStatus, PaymentLogEvent, PaymentStatus
from app.json_types import JsonObject
from app.models.logs import PaymentLog
from app.models.payments import Payment as PaymentModel
from app.providers.credential_resolver import CredentialResolver
from app.providers.paypal import PayPalConnector
from app.providers.stripe import StripeConnector
from app.schemas.payments import ProviderReturnResponse


def _uuid(value: str | UUID) -> UUID:
    return value if isinstance(value, UUID) else UUID(str(value))


def _optional_str(value: object) -> str | None:
    return value if isinstance(value, str) else None


class ProviderCallbackService:
    def __init__(self) -> None:
        self.credential_resolver = CredentialResolver()

    async def handle_stripe_return(
        self, payment_id: str, session_id: str
    ) -> ProviderReturnResponse:
        payment_uuid = _uuid(payment_id)

        with payments_session() as payments_db:
            payment = payments_db.get(PaymentModel, payment_uuid)
            if not payment:
                raise HTTPException(status_code=404, detail="Payment not found")

            merchant_id = UUID(str(payment.merchant_id))
            environment = str(payment.environment)
            credentials = self.credential_resolver.resolve(
                payments_db, merchant_id, "stripe", environment
            )

        connector = StripeConnector(credentials)
        session = await connector.retrieve_checkout_session(session_id)
        session_payment_status = _optional_str(session.get("payment_status"))
        session_status = _optional_str(session.get("status"))
        paid = session_payment_status == "paid" or session_status == "complete"
        status = PaymentStatus.PAYMENT_FINISHED if paid else PaymentStatus.PAYMENT_FAILED

        await self._finalize_provider_return(
            payment_id=payment_uuid,
            status=status,
            provider_status=session_payment_status or session_status,
            payload=session,
            event_type=PaymentLogEvent.EVENT_PROVIDER_PAYMENT_ACCEPTED,
        )

        return ProviderReturnResponse(
            payment_id=payment_id,
            provider="stripe",
            status=status.name,
            provider_status=session_payment_status or session_status,
        )

    async def handle_stripe_cancel(
        self,
        payment_id: str,
        session_id: str | None,
    ) -> ProviderReturnResponse:
        payment_uuid = _uuid(payment_id)
        await self._finalize_provider_return(
            payment_id=payment_uuid,
            status=PaymentStatus.PAYMENT_CANCELLED,
            provider_status="cancelled",
            payload={"session_id": session_id, "reason": "customer_cancelled"},
            event_type=PaymentLogEvent.EVENT_PAYMENT_CANCELLED,
        )
        return ProviderReturnResponse(
            payment_id=payment_id,
            provider="stripe",
            status="PAYMENT_CANCELLED",
        )

    async def handle_paypal_return(self, payment_id: str, token: str) -> ProviderReturnResponse:
        payment_uuid = _uuid(payment_id)

        with payments_session() as payments_db:
            payment = payments_db.get(PaymentModel, payment_uuid)
            if not payment:
                raise HTTPException(status_code=404, detail="Payment not found")

            merchant_id = UUID(str(payment.merchant_id))
            environment = str(payment.environment)
            credentials = self.credential_resolver.resolve(
                payments_db, merchant_id, "paypal", environment
            )

        connector = PayPalConnector(credentials)
        capture = await connector.capture_order(token, environment)
        capture_status = _optional_str(capture.get("status"))
        status = (
            PaymentStatus.PAYMENT_FINISHED
            if capture_status == "COMPLETED"
            else PaymentStatus.PAYMENT_FAILED
        )

        await self._finalize_provider_return(
            payment_id=payment_uuid,
            status=status,
            provider_status=capture_status,
            payload=capture,
            event_type=PaymentLogEvent.EVENT_PROVIDER_PAYMENT_ACCEPTED,
        )

        return ProviderReturnResponse(
            payment_id=payment_id,
            provider="paypal",
            status=status.name,
            provider_status=capture_status,
        )

    async def handle_paypal_cancel(self, payment_id: str) -> ProviderReturnResponse:
        payment_uuid = _uuid(payment_id)
        await self._finalize_provider_return(
            payment_id=payment_uuid,
            status=PaymentStatus.PAYMENT_CANCELLED,
            provider_status="cancelled",
            payload={"reason": "customer_cancelled"},
            event_type=PaymentLogEvent.EVENT_PAYMENT_CANCELLED,
        )
        return ProviderReturnResponse(
            payment_id=payment_id,
            provider="paypal",
            status="PAYMENT_CANCELLED",
        )

    async def _finalize_provider_return(
        self,
        payment_id: str | UUID,
        status: PaymentStatus,
        provider_status: str | None,
        payload: JsonObject,
        event_type: PaymentLogEvent = PaymentLogEvent.EVENT_PROVIDER_PAYMENT_ACCEPTED,
    ) -> None:
        payment_uuid = _uuid(payment_id)
        terminal_states = {
            PaymentStatus.PAYMENT_FINISHED.value,
            PaymentStatus.PAYMENT_FAILED.value,
            PaymentStatus.PAYMENT_CANCELLED.value,
            PaymentStatus.PAYMENT_REFUNDED.value,
        }

        with payments_session() as payments_db:
            payment = payments_db.get(PaymentModel, payment_uuid)
            if not payment:
                raise HTTPException(status_code=404, detail="Payment not found")

            if payment.status not in terminal_states:
                payments_db.execute(
                    PaymentModel.__table__.update()
                    .where(PaymentModel.id == payment_uuid)
                    .values(status=status.value, provider_status=provider_status)
                )
                payments_db.commit()

                log_status = (
                    LogStatus.LOG_SUCCESS.value
                    if status == PaymentStatus.PAYMENT_FINISHED
                    else LogStatus.LOG_FAILED.value
                )
                with logs_session() as logs_db:
                    logs_db.add(
                        PaymentLog(
                            payment_id=payment_uuid,
                            event_type=event_type.value,
                            status=log_status,
                            message=f"[{datetime.utcnow().isoformat()}] Provider return processed: {status.name}",
                            payload=json.dumps(payload),
                        )
                    )
                    logs_db.commit()
            else:
                payments_db.execute(
                    PaymentModel.__table__.update()
                    .where(PaymentModel.id == payment_uuid)
                    .values(provider_status=provider_status or payment.provider_status)
                )
                payments_db.commit()
