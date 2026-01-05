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
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class ProviderPayment(Base):
    __tablename__ = "provider_payments"

    id = Column(Integer, primary_key=True)

    # Soft references (NO foreign keys – external services)
    payment_id = Column(Integer, nullable=False)
    merchant_id = Column(Integer, nullable=False)

    provider = Column(String(50), nullable=False)

    token = Column(String(64), nullable=False, unique=True)
    payment_url = Column(Text, nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        # One payment per provider
        UniqueConstraint(
            "payment_id",
            "provider",
            name="uq_payment_provider",
        ),
        # Useful indexes
        Index("idx_payment_id", "payment_id"),
        Index("idx_merchant_id", "merchant_id"),
    )
