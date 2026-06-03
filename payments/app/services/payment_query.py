from datetime import datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select

from app.db.context import logs_session, payments_session
from app.enums import PaymentLogEvent, PaymentStatus
from app.models.logs import PaymentLog
from app.models.payments import Payment as PaymentModel, Provider


def _uuid(value: str | UUID) -> UUID:
    return value if isinstance(value, UUID) else UUID(str(value))


class PaymentQueryService:
    async def tracking(self, payment_id: str) -> dict:
        payment_uuid = _uuid(payment_id)

        with payments_session() as payments_db:
            payment_row = payments_db.execute(
                select(
                    PaymentModel.id,
                    PaymentModel.status,
                ).where(PaymentModel.id == payment_uuid)
            ).first()

            if not payment_row:
                raise HTTPException(status_code=404, detail="Payment not found")

            pid, payment_status = payment_row

        with logs_session() as logs_db:
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
                    "timestamp": (
                        row.created_at.isoformat()
                        if isinstance(row.created_at, datetime)
                        else row.created_at
                    ),
                }
                for row in logs_rows
            ]

        return {
            "payment_id": str(pid),
            "payment_status": PaymentStatus(payment_status).name,
            "events": events,
        }

    async def show(self, payment_id: str) -> dict:
        payment_uuid = _uuid(payment_id)

        with payments_session() as payments_db:
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

            pid, order_id, amount, price, status, created_at, provider_alias = row

        return {
            "payment_id": str(pid),
            "order_id": order_id,
            "provider": provider_alias,
            "amount": amount,
            "price": price,
            "status": PaymentStatus(status).name,
            "created_at": (
                created_at.isoformat()
                if isinstance(created_at, datetime)
                else created_at
            ),
        }

    async def get_paginated(self, merchant_id: str, page: int, limit: int) -> dict:
        merchant_uuid = UUID(str(merchant_id))
        offset = (page - 1) * limit

        with payments_session() as payments_db:
            total = payments_db.scalar(
                select(func.count())
                .select_from(PaymentModel)
                .where(PaymentModel.merchant_id == merchant_uuid)
            )

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
