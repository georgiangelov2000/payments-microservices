from datetime import datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select

from app.db.context import logs_session, payments_session
from app.enums import PaymentLogEvent, PaymentStatus
from app.models.logs import PaymentLog
from app.models.payments import Payment as PaymentModel
from app.models.payments import Provider
from app.schemas.payments import (
    PaymentListItem,
    PaymentListResponse,
    PaymentShowResponse,
    PaymentTrackingEvent,
    PaymentTrackingResponse,
)


def _uuid(value: str | UUID) -> UUID:
    return value if isinstance(value, UUID) else UUID(str(value))


class PaymentQueryService:
    async def tracking(self, payment_id: str) -> PaymentTrackingResponse:
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
                PaymentTrackingEvent(
                    event_type=PaymentLogEvent(row.event_type).name,
                    message=row.message,
                    payload=row.payload,
                    timestamp=(
                        row.created_at.isoformat()
                        if isinstance(row.created_at, datetime)
                        else row.created_at
                    ),
                )
                for row in logs_rows
            ]

        return PaymentTrackingResponse(
            payment_id=str(pid),
            payment_status=PaymentStatus(payment_status).name,
            events=events,
        )

    async def show(self, payment_id: str) -> PaymentShowResponse:
        payment_uuid = _uuid(payment_id)

        with payments_session() as payments_db:
            row = payments_db.execute(
                select(
                    PaymentModel.id,
                    PaymentModel.order_id,
                    PaymentModel.amount,
                    PaymentModel.price,
                    PaymentModel.status,
                    PaymentModel.currency,
                    PaymentModel.country,
                    PaymentModel.locale,
                    PaymentModel.channel,
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
                currency,
                country,
                locale,
                channel,
                created_at,
                provider_alias,
            ) = row

        return PaymentShowResponse(
            payment_id=str(pid),
            order_id=order_id,
            provider=provider_alias,
            amount=amount,
            price=price,
            status=PaymentStatus(status).name,
            currency=currency,
            country=country,
            locale=locale,
            channel=channel,
            created_at=(created_at.isoformat() if isinstance(created_at, datetime) else created_at),
        )

    async def get_paginated(self, merchant_id: str, page: int, limit: int) -> PaymentListResponse:
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
                    PaymentModel.currency,
                    PaymentModel.country,
                    PaymentModel.locale,
                    PaymentModel.channel,
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
                PaymentListItem(
                    payment_id=str(row.id),
                    order_id=row.order_id,
                    provider=row.alias,
                    amount=row.amount,
                    currency=row.currency,
                    country=row.country,
                    locale=row.locale,
                    channel=row.channel,
                    status=PaymentStatus(row.status).name,
                    created_at=(
                        row.created_at.isoformat()
                        if isinstance(row.created_at, datetime)
                        else row.created_at
                    ),
                )
                for row in rows
            ]

        return PaymentListResponse(
            page=page,
            limit=limit,
            total=total or 0,
            has_next=offset + limit < (total or 0),
            items=items,
        )
