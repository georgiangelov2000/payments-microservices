from sqlalchemy import (
    Column,
    BigInteger,
    SmallInteger,
    DateTime,
    Numeric,
    Index,
    String,
    func,
)
from app.db.bases import PaymentsBase, LogsBase


# =========================
# Payment Logs
# =========================
class PaymentLog(PaymentsBase):
    __tablename__ = "payment_logs"

    id = Column(BigInteger, primary_key=True)
    payment_id = Column(BigInteger, nullable=False)

    event_type = Column(SmallInteger, nullable=False)
    status = Column(SmallInteger, nullable=False)

    message = Column(String(500))
    payload = Column(String(500))

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_payment_logs_payment_id", "payment_id"),
        Index("ix_payment_logs_event_type", "event_type"),
        Index("ix_payment_logs_status", "status"),
        Index("ix_payment_logs_created_at", "created_at"),
    )


# =========================
# Payments
# =========================
class Payment(LogsBase):
    __tablename__ = "payments"

    id = Column(BigInteger, primary_key=True)
    price = Column(Numeric(10, 8), nullable=False)
    amount = Column(Numeric(10, 8), nullable=False)

    merchant_id = Column(BigInteger, nullable=False)
    provider_id = Column(BigInteger, nullable=False)
    order_id = Column(BigInteger, nullable=False, unique=True)

    status = Column(SmallInteger, nullable=False, server_default="1")

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_payments_order_id", "order_id"),
        Index("ix_payments_merchant_id", "merchant_id"),
        Index("ix_payments_provider_id", "provider_id"),
        Index("ix_payments_status", "status"),
        Index("ix_payments_merchant_status", "merchant_id", "status"),
        Index("ix_payments_created_at", "created_at"),
    )
