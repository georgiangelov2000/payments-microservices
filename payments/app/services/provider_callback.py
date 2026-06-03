import json
from datetime import datetime
from uuid import UUID

from fastapi import HTTPException

from app.db.context import logs_session, payments_session
from app.enums import LogStatus, PaymentLogEvent, PaymentStatus
from app.models.logs import PaymentLog
from app.models.payments import Payment as PaymentModel
from app.providers.credential_resolver import CredentialResolver
from app.providers.registry import provider_connector


def _uuid(value: str | UUID) -> UUID:
    return value if isinstance(value, UUID) else UUID(str(value))


class ProviderCallbackService:
    def __init__(self):
        self.credential_resolver = CredentialResolver()

    async def handle_stripe_return(self, payment_id: str, session_id: str) -> dict:
        payment_uuid = _uuid(payment_id)

        with payments_session() as payments_db:
            payment = payments_db.get(PaymentModel, payment_uuid)
            if not payment:
                raise HTTPException(status_code=404, detail="Payment not found")

            credentials = self.credential_resolver.resolve(
                payments_db, payment.merchant_id, "stripe", payment.environment
            )

        connector = provider_connector("stripe", credentials)
        session = await connector.retrieve_checkout_session(session_id)
        paid = session.get("payment_status") == "paid" or session.get("status") == "complete"
        status = PaymentStatus.PAYMENT_FINISHED if paid else PaymentStatus.PAYMENT_FAILED

        await self._finalize_provider_return(
            payment_id=payment_uuid,
            status=status,
            provider_status=session.get("payment_status") or session.get("status"),
            payload=session,
            event_type=PaymentLogEvent.EVENT_PROVIDER_PAYMENT_ACCEPTED,
        )

        return {
            "payment_id": payment_id,
            "provider": "stripe",
            "status": status.name,
            "provider_status": session.get("payment_status") or session.get("status"),
        }

    async def handle_stripe_cancel(self, payment_id: str, session_id: str | None) -> dict:
        payment_uuid = _uuid(payment_id)
        await self._finalize_provider_return(
            payment_id=payment_uuid,
            status=PaymentStatus.PAYMENT_CANCELLED,
            provider_status="cancelled",
            payload={"session_id": session_id, "reason": "customer_cancelled"},
            event_type=PaymentLogEvent.EVENT_PAYMENT_CANCELLED,
        )
        return {"payment_id": payment_id, "provider": "stripe", "status": "PAYMENT_CANCELLED"}

    async def handle_paypal_return(self, payment_id: str, token: str) -> dict:
        payment_uuid = _uuid(payment_id)

        with payments_session() as payments_db:
            payment = payments_db.get(PaymentModel, payment_uuid)
            if not payment:
                raise HTTPException(status_code=404, detail="Payment not found")

            credentials = self.credential_resolver.resolve(
                payments_db, payment.merchant_id, "paypal", payment.environment
            )
            environment = payment.environment

        connector = provider_connector("paypal", credentials)
        capture = await connector.capture_order(token, environment)
        status = (
            PaymentStatus.PAYMENT_FINISHED
            if capture.get("status") == "COMPLETED"
            else PaymentStatus.PAYMENT_FAILED
        )

        await self._finalize_provider_return(
            payment_id=payment_uuid,
            status=status,
            provider_status=capture.get("status"),
            payload=capture,
            event_type=PaymentLogEvent.EVENT_PROVIDER_PAYMENT_ACCEPTED,
        )

        return {
            "payment_id": payment_id,
            "provider": "paypal",
            "status": status.name,
            "provider_status": capture.get("status"),
        }

    async def handle_paypal_cancel(self, payment_id: str) -> dict:
        payment_uuid = _uuid(payment_id)
        await self._finalize_provider_return(
            payment_id=payment_uuid,
            status=PaymentStatus.PAYMENT_CANCELLED,
            provider_status="cancelled",
            payload={"reason": "customer_cancelled"},
            event_type=PaymentLogEvent.EVENT_PAYMENT_CANCELLED,
        )
        return {"payment_id": payment_id, "provider": "paypal", "status": "PAYMENT_CANCELLED"}

    async def _finalize_provider_return(
        self,
        payment_id: str | UUID,
        status: PaymentStatus,
        provider_status: str | None,
        payload: dict,
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
                payment.status = status.value
                payment.provider_status = provider_status
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
                payment.provider_status = provider_status or payment.provider_status
                payments_db.commit()
