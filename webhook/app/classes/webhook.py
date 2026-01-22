from fastapi import Header
from sqlalchemy.orm import Session
from typing import Optional

from app.schemas.webhook import PaymentWebhookRequest
from app.models import Payment as PaymentModel, PaymentLog
from app.db.sessions import PaymentsSessionLocal, LogsSessionLocal
from app.dto.webhook import webhookDTO
from app.constants import (
    PAYMENT_FINISHED,
    PAYMENT_FAILED,
    LOG_PENDING,
    LOG_SUCCESS,
    LOG_FAILED,
    EVENT_PROVIDER_PAYMENT_ACCEPTED,
    MESSAGE_BROKER_MESSAGES,
)


class Webhook:
    """
    Handles provider → payments webhooks

    Responsibilities:
    - Idempotent payment status update (payments DB)
    - Provider event logging (logs DB)
    - Outbox record for async processing (logs DB)
    """

    async def handle(
        self,
        payload: PaymentWebhookRequest,
        x_provider_signature: Optional[str] = Header(default=None),
    ):
        payments_db: Session = PaymentsSessionLocal()
        logs_db: Session = LogsSessionLocal()

        try:
            # ---------------------------
            # Load payment (PAYMENTS DB)
            # ---------------------------
            payment = payments_db.get(PaymentModel, payload.payment_id)
            if not payment:
                return {"message": "payment not found"}

            # ---------------------------
            # Idempotency
            # ---------------------------
            if payment.status in (PAYMENT_FINISHED, PAYMENT_FAILED):
                return {
                    "message": "already processed",
                    "status": payment.status,
                }

            # ---------------------------
            # Update payment status
            # ---------------------------
            if payload.status == "finished":
                payment.status = PAYMENT_FINISHED
                log_status = LOG_SUCCESS
            else:
                payment.status = PAYMENT_FAILED
                log_status = LOG_FAILED

            payments_db.commit()

            # ---------------------------
            # LOG: provider webhook accepted (LOGS DB)
            # ---------------------------
            logs_db.add(
                PaymentLog(
                    payment_id=payment.id,
                    event_type=EVENT_PROVIDER_PAYMENT_ACCEPTED,
                    status=log_status,
                    message="Provider webhook processed",
                    payload=payload.model_dump_json(),
                )
            )

            # ---------------------------
            # Build DTO for async consumers
            # ---------------------------
            payment_dto = webhookDTO(
                payment_id=payment.id,
                order_id=payment.order_id,
                merchant_id=payment.merchant_id,
                status=payment.status,
                amount=str(payment.amount),
                price=str(payment.price),
            )

            # ---------------------------
            # OUTBOX RECORD (LOGS DB)
            # ---------------------------
            logs_db.add(
                PaymentLog(
                    payment_id=payment.id,
                    event_type=MESSAGE_BROKER_MESSAGES,
                    status=LOG_PENDING,
                    payload=payment_dto.model_dump_json(),
                )
            )

            logs_db.commit()

            return {
                "message": "payment updated",
                "payment_id": payment.id,
                "status": payment.status,
            }

        finally:
            payments_db.close()
            logs_db.close()
