import httpx
import os
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
    Subscription,
)
from app.models.logs import PaymentLog
from app.db.sessions import PaymentsSessionLocal, LogsSessionLocal
from app.enums import (
    PaymentStatus,
    SubscriptionStatus,
    PaymentLogEvent,
    LogStatus,
)

PROVIDER_URL = os.getenv("PROVIDER_URL")


class Payment:
    """
    Handles payment creation lifecycle only

    Responsibilities:
    - Create payment
    - Update subscription usage
    - Call provider
    - Write logs to logs DB
    """

    # --------------------------------------------------
    # Create payment
    # --------------------------------------------------
    async def create_payment(self, request: CreatePaymentRequest, merchant_id: str):
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
                    "payment_id": payment_id,
                    "status": PaymentStatus(status).name,
                }

            # --------------------------------------------------
            # Load active subscription
            # --------------------------------------------------
            sub_row = payments_db.execute(
                select(
                    UserSubscription.id,
                    UserSubscription.used_tokens,
                    Subscription.tokens,
                )
                .join(
                    Subscription,
                    Subscription.id == UserSubscription.subscription_id,
                )
                .where(
                    UserSubscription.user_id == merchant_id,
                    UserSubscription.subscription_id == request.subscription_id,
                    UserSubscription.status == SubscriptionStatus.SUBSCRIPTION_ACTIVE.value,
                )
            ).first()

            if not sub_row:
                raise HTTPException(400, "Active subscription not found")

            subscription_id, used_tokens, max_tokens = sub_row

            # --------------------------------------------------
            # Create payment (ORM needed for ID)
            # --------------------------------------------------
            payment = PaymentModel(
                order_id=request.order_id,
                amount=request.amount,
                price=request.price,
                provider_id=provider_id,
                merchant_id=merchant_id,
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
            # Update subscription usage (DIRECT UPDATE)
            # --------------------------------------------------
            new_used = used_tokens + 1
            new_status = (
                SubscriptionStatus.SUBSCRIPTION_INACTIVE.value
                if new_used >= max_tokens
                else SubscriptionStatus.SUBSCRIPTION_ACTIVE.value
            )

            payments_db.execute(
                UserSubscription.__table__.update()
                .where(UserSubscription.id == subscription_id)
                .values(
                    used_tokens=new_used,
                    status=new_status,
                )
            )

            # --------------------------------------------------
            # API request audit (payments DB)
            # --------------------------------------------------
            payments_db.add(
                ApiRequest(
                    event_id=request.event_id,
                    user_id=merchant_id,
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
        # Call provider AFTER commit
        # --------------------------------------------------
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.post(
                    f"{PROVIDER_URL}/payment-links",
                    json={
                        "payment_id": payment_id,
                        "merchant_id": merchant_id,
                        "provider": provider_alias,
                    },
                )
        except httpx.RequestError:
            await self._mark_failed_if_pending(payment_id)
            raise HTTPException(status_code=502, detail="Provider unreachable")

        if resp.status_code != 200:
            await self._mark_failed_if_pending(payment_id)
            raise HTTPException(status_code=502, detail="Provider URL generation failed")

        payment_url = resp.json().get("payment_url")
        now = datetime.utcnow().isoformat()

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
                        f'"payment_url":"{payment_url}"}}'
                    ),
                )
            )
            logs_db.commit()
        finally:
            logs_db.close()

        return {
            "payment_id": payment_id,
            "status": PaymentStatus.PAYMENT_PENDING.name,
            "payment_url": payment_url,
        }


    # --------------------------------------------------
    # Track payment
    # --------------------------------------------------
    async def tracking(self, payment_id: str):
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
                ).where(PaymentModel.id == payment_id)
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
                "payment_id": pid,
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
                .where(PaymentModel.id == payment_id)
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
                "payment_id": pid,
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
        payments_db: Session = PaymentsSessionLocal()

        page = request.page
        limit = request.limit
        offset = (page - 1) * limit

        try:
            # -------- total count --------
            total = payments_db.scalar(
                select(func.count())
                .select_from(PaymentModel)
                .where(PaymentModel.merchant_id == merchant_id)
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
                .where(PaymentModel.merchant_id == merchant_id)
                .order_by(PaymentModel.created_at.desc())
                .limit(limit)
                .offset(offset)
            ).all()

            items = [
                {
                    "payment_id": row.id,
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
    async def _mark_failed_if_pending(self, payment_id: int):
        payments_db: Session = PaymentsSessionLocal()
        try:
            row = payments_db.execute(
                select(PaymentModel.status)
                .where(PaymentModel.id == payment_id)
            ).first()

            if row and row[0] == PaymentStatus.PAYMENT_PENDING.value:
                payments_db.execute(
                    PaymentModel.__table__.update()
                    .where(PaymentModel.id == payment_id)
                    .values(status=PaymentStatus.PAYMENT_FAILED.value)
                )
                payments_db.commit()
        finally:
            payments_db.close()
