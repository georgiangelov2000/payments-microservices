import enum
from sqlalchemy import (
    Column,
    BigInteger,
    String,
    DateTime,
    Numeric,
    Enum,
    UniqueConstraint,
    SmallInteger,
    Index,
    func,
)
from sqlalchemy.orm import relationship

from app.db import Base


# =========================
# Enums
# =========================

class PaymentStatus(enum.Enum):
    pending = "pending"
    finished = "finished"
    failed = "failed"

class SubscriptionStatus(enum.Enum):
    active = "active"
    inactive = "inactive"

class MerchantAPIKeyStatus(enum.Enum):
    active = "active"
    inactive = "inactive"

class Role(enum.Enum):
    admin = "admin"
    merchant = "merchant"

class Userstatus(enum.Enum):
    active = "active"
    inactive = "inactive"


# =========================
# Users
# =========================

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True)
    name = Column(String(255), nullable=False)

    email = Column(String(255), nullable=False, unique=True)
    password = Column(String(255), nullable=False)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    remember_token = Column(String(100), nullable=True)
    
    status = Column(
        Enum(Userstatus, name="user_status"),
        nullable=False,
        server_default=Userstatus.active.value,
    )

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

    __table_args__ = (
        Index("ix_users_email", "email"),
        Index("ix_users_status", "status"),
        Index("ix_users_role", "role"),
    )


# =========================
# Subscriptions
# =========================
class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(BigInteger, primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    price = Column(Numeric(10, 2), nullable=False)
    tokens = Column(BigInteger, nullable=False)

    __table_args__ = (
        Index("ix_subscription_plans_name", "name"),
    )

# =========================
# Merchant API Keys
# =========================

class MerchantAPIKey(Base):
    __tablename__ = "merchant_api_keys"

    id = Column(BigInteger, primary_key=True)
    hash = Column(String(64), nullable=False, unique=True)

    merchant_id = Column(BigInteger, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(
        Enum(MerchantAPIKeyStatus, name="merchant_api_key_status"),
        nullable=False,
        server_default=MerchantAPIKeyStatus.active.value,
    )

    merchant = relationship(
        "User",
        primaryjoin="foreign(MerchantAPIKey.merchant_id) == User.id",
        viewonly=True,
    )

    __table_args__ = (
        UniqueConstraint("hash", name="uq_merchant_api_keys_hash"),
        Index("ix_merchant_api_keys_status", "status"),
        Index("ix_api_keys_hash", "hash"),
        Index("ix_api_keys_merchant_id", "merchant_id"),
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
    provider_id = Column(BigInteger, nullable=False)

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

    provider = relationship(
        "Provider",
        primaryjoin="foreign(Payment.provider_id) == Provider.id",
        viewonly=True,
    )

    __table_args__ = (
        Index("ix_payments_order_id", "order_id"),
        Index("ix_payments_merchant_id", "merchant_id"),
        Index("ix_payments_provider_id", "provider_id"),
        Index("ix_payments_status", "status"),
        Index("ix_payments_merchant_status", "merchant_id", "status"),
        Index("ix_payments_created_at", "created_at"),
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

    __table_args__ = (
        Index("ix_providers_alias", "alias"),
        Index("ix_providers_name", "name"),
    )

# =========================
# User Subscriptions
# =========================

class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, nullable=False)
    subscription_id = Column(BigInteger, nullable=False)
    used_tokens = Column(BigInteger, nullable = False, default = 0)
    
    status = Column(
        Enum(SubscriptionStatus, name="subscription_status"),
        nullable=False,
        server_default=SubscriptionStatus.active.value,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship(
        "User",
        primaryjoin="foreign(UserSubscription.user_id) == User.id",
        viewonly=True,
    )

    subscription = relationship(
        "Subscription",
        primaryjoin="foreign(UserSubscription.subscription_id) == Subscription.id",
        viewonly=True,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "subscription_id", name="uq_user_subscriptions_user_subscription"),
        Index("ix_user_subscriptions_user_id", "user_id"),
        Index("ix_user_subscriptions_subscription_id", "subscription_id"),
    )

# =========================
# API Requests (Usage / Audit)
# =========================

class ApiRequest(Base):
    __tablename__ = "api_requests"

    id = Column(BigInteger, primary_key=True)

    event_id = Column(String(255), nullable=False)
    subscription_id = Column(BigInteger, nullable=False)
    user_id = Column(BigInteger, nullable=False)

    order_id = Column(BigInteger, nullable=True)

    amount = Column(Numeric(10, 8), nullable=False)

    source = Column(String(50), nullable=False)

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

    # =========================
    # Relationships
    # =========================

    user = relationship(
        "User",
        primaryjoin="foreign(ApiRequest.user_id) == User.id",
        viewonly=True,
    )

    subscription = relationship(
        "Subscription",
        primaryjoin="foreign(ApiRequest.subscription_id) == Subscription.id",
        viewonly=True,
    )

    # =========================
    # Constraints & Indexes
    # =========================
    __table_args__ = (
        # idempotency
        UniqueConstraint("event_id", name="uq_api_requests_event_id"),

        # fast lookups
        Index("ix_api_requests_user_id", "user_id"),
        Index("ix_api_requests_subscription_id", "subscription_id"),
        Index("ix_api_requests_order_id", "order_id"),
        Index("ix_api_requests_source", "source"),
        Index("ix_api_requests_ts", "ts"),

        # common filters
        Index(
            "ix_api_requests_user_subscription_ts",
            "user_id",
            "subscription_id",
            "ts",
        ),
    )
