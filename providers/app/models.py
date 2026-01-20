from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    UniqueConstraint,
    Index,
    func,
)
from app.db import Base


class ProviderPayment(Base):
    __tablename__ = "provider_payments"

    id = Column(Integer, primary_key=True)

    # Soft references (NO foreign keys – external services)
    payment_id = Column(Integer, nullable=False)
    merchant_id = Column(Integer, nullable=False)

    provider = Column(String(50), nullable=False)

    token = Column(String(64), nullable=False, unique=True)
    payment_url = Column(Text, nullable=False)

    status = Column(
        String(20),
        nullable=False,
        server_default="pending",
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        # One provider entry per payment
        UniqueConstraint(
            "payment_id",
            "provider",
            name="uq_payment_provider",
        ),

        Index("ix_provider_payments_token", "token"),
        Index("ix_provider_payments_payment_id", "payment_id"),
        Index("ix_provider_payments_merchant_id", "merchant_id"),
        Index("ix_provider_payments_provider", "provider"),
        Index("ix_provider_payments_token", "token")
    )
