import enum
from sqlalchemy import (
    Column,
    BigInteger,
    String,
    DateTime,
    Numeric,
    Enum,
    UniqueConstraint,
    CheckConstraint,
    func,
)
from sqlalchemy.orm import relationship, foreign

from app.db import Base


# =========================
# Enums
# =========================

class PaymentStatus(enum.Enum):
    pending = "pending"
    finished = "finished"
    failed = "failed"


class Role(enum.Enum):
    admin = "admin"
    merchant = "merchant"


# =========================
# Users
# =========================

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    password = Column(String(255), nullable=False)

    role = Column(
        Enum(Role, name="user_role"),
        nullable=False,
        server_default=Role.merchant.value,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    payments = relationship(
        "Payment",
        primaryjoin="User.id == foreign(Payment.merchant_id)",
        viewonly=True,
    )

    api_keys = relationship(
        "MerchantAPIKey",
        primaryjoin="User.id == foreign(MerchantAPIKey.merchant_id)",
        viewonly=True,
    )


# =========================
# Merchant API Keys
# =========================

class MerchantAPIKey(Base):
    __tablename__ = "merchant_api_keys"

    id = Column(BigInteger, primary_key=True)
    hash = Column(String(64), nullable=False, unique=True)

    merchant_id = Column(BigInteger, nullable=False)

    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    merchant = relationship(
        "User",
        primaryjoin="foreign(MerchantAPIKey.merchant_id) == User.id",
        viewonly=True,
    )

    __table_args__ = (
        UniqueConstraint("hash", name="uq_merchant_api_keys_hash"),
        CheckConstraint("end_date > start_date", name="ck_api_keys_valid_period"),
    )


# =========================
# Payments
# =========================

class Payment(Base):
    __tablename__ = "payments"

    id = Column(BigInteger, primary_key=True)

    price = Column(Numeric(10, 8), nullable=False)
    amount = Column(Numeric(10, 8), nullable=False)

    merchant_id = Column(BigInteger, nullable=False)

    order_id = Column(BigInteger, nullable=False, unique=True)

    status = Column(
        Enum(PaymentStatus, name="payment_status"),
        nullable=False,
        server_default=PaymentStatus.pending.value,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    merchant = relationship(
        "User",
        primaryjoin="foreign(Payment.merchant_id) == User.id",
        viewonly=True,
    )


# =========================
# Providers
# =========================

class Provider(Base):
    __tablename__ = "providers"

    id = Column(BigInteger, primary_key=True)
    name = Column(String(255), nullable=False)
    alias = Column(String(255), nullable=False, unique=True)
    url = Column(String(255), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
