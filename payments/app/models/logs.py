from sqlalchemy import (
    Column,
    BigInteger,
    SmallInteger,
    Text,
    DateTime,
    Index,
    func,
)
from app.db.bases import LogsBase

# =========================
# Payment Logs
# =========================
class PaymentLog(LogsBase):
    __tablename__ = "payment_logs"

    id = Column(BigInteger, primary_key=True)
    payment_id = Column(BigInteger, nullable=False)

    event_type = Column(SmallInteger, nullable=False)
    status = Column(SmallInteger, nullable=False)

    message = Column(Text, nullable=True)
    payload = Column(Text, nullable=True)

    retry_count = Column(
        SmallInteger,
        nullable=False,
        default=0,
        server_default="0"
    )

    next_retry_at = Column(DateTime(timezone=True), nullable=True)


    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_payment_logs_payment_id", "payment_id"),
        Index("ix_payment_logs_event_type", "event_type"),
        Index("ix_payment_logs_status", "status"),
        Index("ix_payment_logs_created_at", "created_at"),
        Index("ix_payment_logs_next_retry_at", "next_retry_at"),
    )