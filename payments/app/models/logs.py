from sqlalchemy import (
    Column,
    DateTime,
    Index,
    SmallInteger,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.bases import LogsBase
from app.support.uuid import uuid7


# =========================
# Payment Logs
# =========================
class PaymentLog(LogsBase):
    __tablename__ = "payment_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid7)
    payment_id = Column(UUID(as_uuid=True), nullable=False)

    event_type = Column(SmallInteger, nullable=False)
    status = Column(SmallInteger, nullable=False)

    message = Column(Text, nullable=True)
    payload = Column(Text, nullable=True)

    retry_count = Column(SmallInteger, nullable=False, default=0, server_default="0")

    next_retry_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_payment_logs_payment_id", "payment_id"),
        Index("ix_payment_logs_event_type", "event_type"),
        Index("ix_payment_logs_status", "status"),
        Index("ix_payment_logs_created_at", "created_at"),
        Index("ix_payment_logs_next_retry_at", "next_retry_at"),
    )
