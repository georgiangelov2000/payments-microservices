import json
from uuid import UUID

import httpx
from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from datetime import datetime

from app.schemas.payments import CreatePaymentRequest, GetPaymentsRequest
from app.models.payments import (
    Provider,
    Payment as PaymentModel,
    ApiRequest,
    UserSubscription,
)
from app.models.logs import PaymentLog
from app.db.sessions import PaymentsSessionLocal, LogsSessionLocal
from app.enums import (
    PaymentStatus,
    SubscriptionStatus,
    PaymentLogEvent,
    LogStatus,
)
from app.providers.base import CheckoutRequest
from app.providers.registry import provider_connector


class Payment:
    """
    Handles payment creation lifecycle only

    Responsibilities:
    - Create payment
    - Track billing-period payment usage
    - Create provider checkout/order
    - Write logs to logs DB
    """

    def _uuid(self, value: str | UUID) -> UUID:
        return value if isinstance(value, UUID) else UUID(str(value))

    # --------------------------------------------------
    # Create payment
    # --------------------------------------------------
    async def create_payment(self, request: CreatePaymentRequest, merchant_id: str):
        merchant_uuid = UUID(str(merchant_id))
        payments_db: Session = PaymentsSessionLocal()
        logs_db: Session = LogsSessionLocal()

        try:
            # --------------------------------------------------
            # Provider lookup (ONLY id + alias)
            # --------------------------------------------------
            provider_row = payments_db.execute(
                select(Provider.id, Provider.alias)
                .where(Provider.alias == request.alias)
            ).first()

            if not provider_row:
                raise HTTPException(status_code=400, detail="Provider not found")

            provider_id, provider_alias = provider_row

            # --------------------------------------------------
            # Idempotency check (ONLY id + status)
            # --------------------------------------------------
            existing = payments_db.execute(
                select(PaymentModel.id, PaymentModel.status)
                .where(PaymentModel.order_id == request.order_id)
            ).first()

            if existing:
                payment_id, status = existing
                return {
                    "message": "payment already exists",
                    "payment_id": str(payment_id),
                    "status": PaymentStatus(status).name,
                }

            # --------------------------------------------------
            # Load active merchant subscription
            # --------------------------------------------------
            sub_row = payments_db.execute(
                select(
                    UserSubscription.id,
                )
                .where(
                    UserSubscription.user_id == merchant_uuid,
                    UserSubscription.subscription_id == request.subscription_id,
                    UserSubscription.status == SubscriptionStatus.SUBSCRIPTION_ACTIVE.value,
                )
            ).first()

            if not sub_row:
                raise HTTPException(400, "Active subscription not found")

            subscription_id = sub_row[0]

            # --------------------------------------------------
            # Create payment (ORM needed for ID)
            # --------------------------------------------------
            payment = PaymentModel(
                order_id=request.order_id,
                amount=request.amount,
                price=request.price,
                provider_id=provider_id,
                merchant_id=merchant_uuid,
                status=PaymentStatus.PAYMENT_PENDING.value,
            )

            payments_db.add(payment)
            payments_db.flush()
            payment_id = payment.id

            # --------------------------------------------------
            # LOG: payment created (logs DB)
            # --------------------------------------------------
            logs_db.add(
                PaymentLog(
                    payment_id=payment_id,
                    event_type=PaymentLogEvent.EVENT_PAYMENT_CREATED.value,
                    status=LogStatus.LOG_SUCCESS.value,
                    message=f"[{datetime.utcnow().isoformat()}] Payment created",
                )
            )

            # --------------------------------------------------
            # Track billing-period usage (not an API quota)
            # --------------------------------------------------
            payments_db.execute(
                UserSubscription.__table__.update()
                .where(UserSubscription.id == subscription_id)
                .values(
                    current_period_transactions=(
                        UserSubscription.current_period_transactions + 1
                    ),
                    current_period_volume=(
                        UserSubscription.current_period_volume + request.price
                    ),
                )
            )

            # --------------------------------------------------
            # API request audit (payments DB)
            # --------------------------------------------------
            payments_db.add(
                ApiRequest(
                    event_id=request.event_id,
                    user_id=merchant_uuid,
                    subscription_id=request.subscription_id,
                    payment_id=payment_id,
                    amount=request.amount,
                    source="payments:create",
                )
            )

            # --------------------------------------------------
            # Commit atomically
            # --------------------------------------------------
            payments_db.commit()
            logs_db.commit()

        except Exception:
            payments_db.rollback()
            logs_db.rollback()
            raise

        finally:
            payments_db.close()
            logs_db.close()

        # --------------------------------------------------
        # LOG: provider request sent (logs DB)
        # --------------------------------------------------
        logs_db = LogsSessionLocal()
        try:
            logs_db.add(
                PaymentLog(
                    payment_id=payment_id,
                    event_type=PaymentLogEvent.EVENT_PROVIDER_REQUEST_SENT.value,
                    status=LogStatus.LOG_SUCCESS.value,
                    message=f"[{datetime.utcnow().isoformat()}] Provider URL request sent",
                    payload=f'{{"provider":"{provider_alias}"}}',
                )
            )
            logs_db.commit()
        finally:
            logs_db.close()

        # --------------------------------------------------
        # Create real sandbox checkout/order AFTER commit
        # --------------------------------------------------
        try:
            checkout = await provider_connector(provider_alias).create_checkout(
                CheckoutRequest(
                    payment_id=str(payment_id),
                    merchant_id=str(merchant_uuid),
                    order_id=request.order_id,
                    amount=request.price,
                    currency="USD",
                    description=f"Order #{request.order_id}",
                )
            )
        except HTTPException:
            await self._mark_failed_if_pending(payment_id)
            raise
        except httpx.RequestError:
            await self._mark_failed_if_pending(payment_id)
            raise HTTPException(status_code=502, detail="Provider unreachable")

        now = datetime.utcnow().isoformat()

        payments_db = PaymentsSessionLocal()
        try:
            payments_db.execute(
                PaymentModel.__table__.update()
                .where(PaymentModel.id == payment_id)
                .values(
                    provider_reference=checkout.provider_reference,
                    provider_checkout_url=checkout.payment_url,
                    provider_status=checkout.raw_status,
                )
            )
            payments_db.commit()
        finally:
            payments_db.close()

        # --------------------------------------------------
        # UPDATE LOG: append awaiting customer message
        # --------------------------------------------------
        logs_db = LogsSessionLocal()
        try:
            logs_db.execute(
                PaymentLog.__table__.update()
                .where(
                    PaymentLog.payment_id == payment_id,
                    PaymentLog.event_type == PaymentLogEvent.EVENT_PROVIDER_REQUEST_SENT.value,
                )
                .values(
                    message=(
                        PaymentLog.message
                        + "\n"
                        + f"[{now}] Payment is pending and waiting for customer action."
                    ),
                    payload=(
                        f'{{"provider":"{provider_alias}",'
                        f'"provider_reference":"{checkout.provider_reference}",'
                        f'"payment_url":"{checkout.payment_url}"}}'
                    ),
                )
            )
            logs_db.commit()
        finally:
            logs_db.close()

        return {
            "payment_id": str(payment_id),
            "status": PaymentStatus.PAYMENT_PENDING.name,
            "provider": provider_alias,
            "provider_reference": checkout.provider_reference,
            "payment_url": checkout.payment_url,
        }

    async def stripe_return(self, payment_id: str, session_id: str):
        session = await provider_connector("stripe").retrieve_checkout_session(session_id)
        paid = session.get("payment_status") == "paid" or session.get("status") == "complete"
        status = PaymentStatus.PAYMENT_FINISHED if paid else PaymentStatus.PAYMENT_FAILED

        await self._finalize_provider_return(
            payment_id=payment_id,
            status=status,
            provider_status=session.get("payment_status") or session.get("status"),
            payload=session,
        )

        return {
            "payment_id": payment_id,
            "provider": "stripe",
            "status": status.name,
            "provider_status": session.get("payment_status") or session.get("status"),
        }

    async def stripe_cancel(self, payment_id: str, session_id: str | None = None):
        payment_uuid = self._uuid(payment_id)
        await self._finalize_provider_return(
            payment_id=payment_uuid,
            status=PaymentStatus.PAYMENT_FAILED,
            provider_status="cancelled",
            payload={"session_id": session_id, "reason": "customer_cancelled"},
        )
        return {"payment_id": payment_id, "provider": "stripe", "status": "PAYMENT_FAILED"}

    async def paypal_return(self, payment_id: str, token: str):
        payment_uuid = self._uuid(payment_id)
        capture = await provider_connector("paypal").capture_order(token)
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
        )

        return {
            "payment_id": payment_id,
            "provider": "paypal",
            "status": status.name,
            "provider_status": capture.get("status"),
        }

    async def paypal_cancel(self, payment_id: str):
        payment_uuid = self._uuid(payment_id)
        await self._finalize_provider_return(
            payment_id=payment_uuid,
            status=PaymentStatus.PAYMENT_FAILED,
            provider_status="cancelled",
            payload={"reason": "customer_cancelled"},
        )
        return {"payment_id": payment_id, "provider": "paypal", "status": "PAYMENT_FAILED"}


    # --------------------------------------------------
    # Track payment
    # --------------------------------------------------
    async def tracking(self, payment_id: str):
        payment_uuid = self._uuid(payment_id)
        payments_db: Session = PaymentsSessionLocal()
        logs_db: Session = LogsSessionLocal()

        try:
            # ---------------------------------------------
            # Load payment status (payments DB)
            # ---------------------------------------------
            payment_row = payments_db.execute(
                select(
                    PaymentModel.id,
                    PaymentModel.status,
                ).where(PaymentModel.id == payment_uuid)
            ).first()

            if not payment_row:
                raise HTTPException(status_code=404, detail="Payment not found")

            pid, payment_status = payment_row

            # ---------------------------------------------
            # Load logs timeline (logs DB)
            # ---------------------------------------------
            logs_rows = logs_db.execute(
                select(
                    PaymentLog.event_type,
                    PaymentLog.message,
                    PaymentLog.payload,
                    PaymentLog.created_at,
                )
                .where(PaymentLog.payment_id == pid)
                .order_by(PaymentLog.created_at.asc())
            ).all()

            events = [
                {
                    "event_type": PaymentLogEvent(row.event_type).name,
                    "message": row.message,
                    "payload": row.payload,
                    "timestamp": row.created_at.isoformat()
                    if isinstance(row.created_at, datetime)
                    else row.created_at,
                }
                for row in logs_rows
            ]

            return {
                "payment_id": str(pid),
                "payment_status": PaymentStatus(payment_status).name,
                "events": events,
            }

        finally:
            payments_db.close()
            logs_db.close()

    # --------------------------------------------------
    # Show payment (details)
    # --------------------------------------------------
    async def show(self, payment_id: str):
        payment_uuid = self._uuid(payment_id)
        payments_db: Session = PaymentsSessionLocal()

        try:
            row = payments_db.execute(
                select(
                    PaymentModel.id,
                    PaymentModel.order_id,
                    PaymentModel.amount,
                    PaymentModel.price,
                    PaymentModel.status,
                    PaymentModel.created_at,
                    Provider.alias,
                )
                .join(Provider, Provider.id == PaymentModel.provider_id)
                .where(PaymentModel.id == payment_uuid)
            ).first()

            if not row:
                raise HTTPException(status_code=404, detail="Payment not found")

            (
                pid,
                order_id,
                amount,
                price,
                status,
                created_at,
                provider_alias,
            ) = row

            return {
                "payment_id": str(pid),
                "order_id": order_id,
                "provider": provider_alias,
                "amount": amount,
                "price": price,
                "status": PaymentStatus(status).name,
                "created_at": created_at.isoformat()
                if isinstance(created_at, datetime)
                else created_at,
            }

        finally:
            payments_db.close()


    # --------------------------------------------------
    # Get payments (paginated list)
    # --------------------------------------------------
    async def get(
        self,
        request: GetPaymentsRequest,
        merchant_id: str,
    ):
        merchant_uuid = UUID(str(merchant_id))
        payments_db: Session = PaymentsSessionLocal()

        page = request.page
        limit = request.limit
        offset = (page - 1) * limit

        try:
            # -------- total count --------
            total = payments_db.scalar(
                select(func.count())
                .select_from(PaymentModel)
                .where(PaymentModel.merchant_id == merchant_uuid)
            )

            # -------- paginated rows --------
            rows = payments_db.execute(
                select(
                    PaymentModel.id,
                    PaymentModel.order_id,
                    PaymentModel.amount,
                    PaymentModel.status,
                    PaymentModel.created_at,
                    Provider.alias,
                )
                .join(Provider, Provider.id == PaymentModel.provider_id)
                .where(PaymentModel.merchant_id == merchant_uuid)
                .order_by(PaymentModel.created_at.desc())
                .limit(limit)
                .offset(offset)
            ).all()

            items = [
                {
                    "payment_id": str(row.id),
                    "order_id": row.order_id,
                    "provider": row.alias,
                    "amount": row.amount,
                    "status": PaymentStatus(row.status).name,
                    "created_at": (
                        row.created_at.isoformat()
                        if isinstance(row.created_at, datetime)
                        else row.created_at
                    ),
                }
                for row in rows
            ]

            return {
                "page": page,
                "limit": limit,
                "total": total,
                "has_next": offset + limit < total,
                "items": items,
            }

        finally:
            payments_db.close()

    # --------------------------------------------------
    # Safe failure transition (payments DB only)
    # --------------------------------------------------
    async def _mark_failed_if_pending(self, payment_id: str):
        payment_uuid = self._uuid(payment_id)
        payments_db: Session = PaymentsSessionLocal()
        try:
            result = payments_db.execute(
                PaymentModel.__table__.update()
                .where(PaymentModel.id == payment_uuid)
                .where(PaymentModel.status == PaymentStatus.PAYMENT_PENDING.value)
                .values(status=PaymentStatus.PAYMENT_FAILED.value)
            )
            payments_db.commit()
        finally:
            payments_db.close()

    async def _finalize_provider_return(
        self,
        payment_id: str | UUID,
        status: PaymentStatus,
        provider_status: str | None,
        payload: dict,
    ):
        payments_db: Session = PaymentsSessionLocal()
        logs_db: Session = LogsSessionLocal()
        payment_uuid = self._uuid(payment_id)

        try:
            payment = payments_db.get(PaymentModel, payment_uuid)
            if not payment:
                raise HTTPException(status_code=404, detail="Payment not found")

            if payment.status not in (
                PaymentStatus.PAYMENT_FINISHED.value,
                PaymentStatus.PAYMENT_FAILED.value,
            ):
                payment.status = status.value
                payment.provider_status = provider_status
                payments_db.commit()

                logs_db.add(
                    PaymentLog(
                        payment_id=payment_uuid,
                        event_type=PaymentLogEvent.EVENT_PROVIDER_PAYMENT_ACCEPTED.value,
                        status=(
                            LogStatus.LOG_SUCCESS.value
                            if status == PaymentStatus.PAYMENT_FINISHED
                            else LogStatus.LOG_FAILED.value
                        ),
                        message=f"[{datetime.utcnow().isoformat()}] Provider sandbox return processed",
                        payload=json.dumps(payload),
                    )
                )
                logs_db.commit()
            else:
                payment.provider_status = provider_status or payment.provider_status
                payments_db.commit()

        finally:
            payments_db.close()
            logs_db.close()
