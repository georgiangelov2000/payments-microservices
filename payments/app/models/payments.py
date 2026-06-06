from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Index,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.bases import PaymentsBase
from app.support.uuid import uuid7


# =========================
# Users
# =========================
class User(PaymentsBase):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid7)
    name = Column(String(255), nullable=False)

    email = Column(String(255), nullable=False, unique=True)
    password = Column(String(255), nullable=False)

    email_verified_at = Column(DateTime(timezone=True))
    remember_token = Column(String(100))

    status = Column(SmallInteger, nullable=False, server_default="1")  # 1=active
    role = Column(SmallInteger, nullable=False, server_default="2")  # 2=merchant

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    payments = relationship(
        "Payment", primaryjoin="User.id == foreign(Payment.merchant_id)", viewonly=True
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
class Subscription(PaymentsBase):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid7)
    name = Column(String(255), nullable=False, unique=True)
    code = Column(String(50), nullable=False, unique=True)
    monthly_fee = Column(Numeric(10, 2), nullable=False)
    transaction_fee_percent = Column(Numeric(5, 2), nullable=False, server_default="0")
    transaction_fee_fixed = Column(Numeric(10, 2), nullable=False, server_default="0")
    included_transactions = Column(BigInteger, nullable=False, server_default="0")

    __table_args__ = (Index("ix_subscriptions_name", "name"),)


# =========================
# Merchant API Keys
# =========================
class MerchantAPIKey(PaymentsBase):
    __tablename__ = "merchant_api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid7)
    hash = Column(String(64), nullable=False, unique=True)
    merchant_id = Column(UUID(as_uuid=True), nullable=False)

    status = Column(SmallInteger, nullable=False, server_default="1")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    merchant = relationship(
        "User", primaryjoin="foreign(MerchantAPIKey.merchant_id) == User.id", viewonly=True
    )

    __table_args__ = (
        UniqueConstraint("hash", name="uq_merchant_api_keys_hash"),
        Index("ix_merchant_api_keys_status", "status"),
        Index("ix_merchant_api_keys_hash", "hash"),
        Index("ix_merchant_api_keys_merchant_id", "merchant_id"),
    )


# =========================
# Providers
# =========================
class Provider(PaymentsBase):
    __tablename__ = "providers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid7)
    name = Column(String(255), nullable=False)
    alias = Column(String(255), nullable=False, unique=True)
    url = Column(String(255), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_providers_alias", "alias"),
        Index("ix_providers_name", "name"),
    )


# =========================
# Merchant Provider Credentials
# =========================
class MerchantProviderCredential(PaymentsBase):
    __tablename__ = "merchant_provider_credentials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid7)
    merchant_id = Column(UUID(as_uuid=True), nullable=False)
    provider_id = Column(UUID(as_uuid=True), nullable=False)
    environment = Column(String(20), nullable=False, server_default="test")
    display_name = Column(String(255))
    public_key = Column(String(255))
    secret_value = Column(String)
    status = Column(String(30), nullable=False, server_default="pending")
    last_validated_at = Column(DateTime(timezone=True))
    last_rotated_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "merchant_id", "provider_id", "environment", name="merchant_provider_credentials_unique"
        ),
        Index("ix_merchant_provider_credentials_merchant_id", "merchant_id"),
        Index("ix_merchant_provider_credentials_provider_id", "provider_id"),
        Index("ix_merchant_provider_credentials_status", "status"),
    )


# =========================
# Payments
# =========================
class Payment(PaymentsBase):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid7)
    price = Column(Numeric(18, 8), nullable=False)
    amount = Column(Numeric(18, 8), nullable=False)

    merchant_id = Column(UUID(as_uuid=True), nullable=False)
    provider_id = Column(UUID(as_uuid=True), nullable=False)
    order_id = Column(BigInteger, nullable=False, unique=True)
    provider_reference = Column(String(255))
    provider_checkout_url = Column(String(2048))
    provider_status = Column(String(100))
    environment = Column(String(20), nullable=False, server_default="test")
    currency = Column(String(3), nullable=False, server_default="USD")
    country = Column(String(2))
    locale = Column(String(20))
    channel = Column(String(30))
    routing_strategy = Column(String(30))
    idempotency_key = Column(String(255))
    routing_metadata = Column(JSONB)

    status = Column(SmallInteger, nullable=False, server_default="1")  # 1=pending

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    merchant = relationship(
        "User", primaryjoin="foreign(Payment.merchant_id) == User.id", viewonly=True
    )
    provider = relationship(
        "Provider", primaryjoin="foreign(Payment.provider_id) == Provider.id", viewonly=True
    )

    __table_args__ = (
        Index("ix_payments_order_id", "order_id"),
        Index("ix_payments_merchant_id", "merchant_id"),
        Index("ix_payments_provider_id", "provider_id"),
        Index("ix_payments_provider_reference", "provider_reference"),
        Index("ix_payments_status", "status"),
        Index("ix_payments_merchant_status", "merchant_id", "status"),
        Index("ix_payments_created_at", "created_at"),
        Index("ix_payments_environment", "environment"),
        Index("ix_payments_currency", "currency"),
        Index("ix_payments_country", "country"),
        Index("ix_payments_channel", "channel"),
        Index("ix_payments_routing_strategy", "routing_strategy"),
        Index("ix_payments_idempotency_key", "idempotency_key"),
    )


class ProviderRoutingConfiguration(PaymentsBase):
    __tablename__ = "provider_routing_configurations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid7)
    merchant_id = Column(UUID(as_uuid=True), nullable=False)
    environment = Column(String(20), nullable=False, server_default="test")
    strategy = Column(String(30), nullable=False, server_default="priority")
    enabled = Column(Boolean, nullable=False, server_default="true")
    priority_chain = Column(Text, nullable=False, server_default="[]")
    failover_chain = Column(Text, nullable=False, server_default="[]")
    weighted_distribution = Column(Text, nullable=False, server_default="{}")
    metadata_json = Column("metadata", Text, nullable=False, server_default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("merchant_id", "environment", name="provider_routing_config_unique"),
        Index("ix_provider_routing_configurations_merchant_id", "merchant_id"),
        Index("ix_provider_routing_configurations_environment", "environment"),
        Index("ix_provider_routing_configurations_strategy", "strategy"),
        Index("ix_provider_routing_configurations_enabled", "enabled"),
    )


class ProviderRoutingRule(PaymentsBase):
    __tablename__ = "provider_routing_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid7)
    merchant_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(255), nullable=False)
    environment = Column(String(20), nullable=False, server_default="test")
    provider_alias = Column(String(255), nullable=False)
    priority = Column(SmallInteger, nullable=False, server_default="100")
    enabled = Column(Boolean, nullable=False, server_default="true")
    conditions = Column(Text, nullable=False, server_default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_provider_routing_rules_merchant_id", "merchant_id"),
        Index("ix_provider_routing_rules_environment", "environment"),
        Index("ix_provider_routing_rules_provider_alias", "provider_alias"),
        Index("ix_provider_routing_rules_priority", "priority"),
        Index("ix_provider_routing_rules_enabled", "enabled"),
        Index("provider_routing_rules_lookup", "merchant_id", "environment", "enabled", "priority"),
    )


class ProviderHealthStatus(PaymentsBase):
    __tablename__ = "provider_health_statuses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid7)
    provider_id = Column(UUID(as_uuid=True))
    merchant_id = Column(UUID(as_uuid=True))
    provider_alias = Column(String(255), nullable=False)
    environment = Column(String(20), nullable=False, server_default="test")
    status = Column(String(30), nullable=False, server_default="healthy")
    consecutive_failures = Column(BigInteger, nullable=False, server_default="0")
    timeout_count = Column(BigInteger, nullable=False, server_default="0")
    failure_rate = Column(Numeric(5, 2), nullable=False, server_default="0")
    disabled_until = Column(DateTime(timezone=True))
    last_success_at = Column(DateTime(timezone=True))
    last_failure_at = Column(DateTime(timezone=True))
    last_checked_at = Column(DateTime(timezone=True))
    last_error = Column(Text)
    metadata_json = Column("metadata", Text, nullable=False, server_default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "merchant_id", "provider_alias", "environment", name="provider_health_scope_unique"
        ),
        Index("ix_provider_health_statuses_provider_id", "provider_id"),
        Index("ix_provider_health_statuses_merchant_id", "merchant_id"),
        Index("ix_provider_health_statuses_provider_alias", "provider_alias"),
        Index("ix_provider_health_statuses_environment", "environment"),
        Index("ix_provider_health_statuses_status", "status"),
        Index("ix_provider_health_statuses_disabled_until", "disabled_until"),
        Index("provider_health_status_lookup", "provider_alias", "environment", "status"),
    )


class PaymentRoutingAttempt(PaymentsBase):
    __tablename__ = "payment_routing_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid7)
    payment_id = Column(UUID(as_uuid=True))
    merchant_id = Column(UUID(as_uuid=True), nullable=False)
    provider_id = Column(UUID(as_uuid=True))
    provider_alias = Column(String(255), nullable=False)
    environment = Column(String(20), nullable=False, server_default="test")
    strategy = Column(String(30), nullable=False)
    attempt_number = Column(SmallInteger, nullable=False, server_default="1")
    status = Column(String(30), nullable=False)
    idempotency_key = Column(String(255))
    latency_ms = Column(BigInteger)
    error_code = Column(Text)
    error_message = Column(Text)
    routing_snapshot = Column(Text, nullable=False, server_default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_payment_routing_attempts_payment_id", "payment_id"),
        Index("ix_payment_routing_attempts_merchant_id", "merchant_id"),
        Index("ix_payment_routing_attempts_provider_id", "provider_id"),
        Index("ix_payment_routing_attempts_provider_alias", "provider_alias"),
        Index("ix_payment_routing_attempts_environment", "environment"),
        Index("ix_payment_routing_attempts_strategy", "strategy"),
        Index("ix_payment_routing_attempts_status", "status"),
        Index("ix_payment_routing_attempts_idempotency_key", "idempotency_key"),
        Index("payment_routing_attempts_merchant_time", "merchant_id", "environment", "created_at"),
        Index("payment_routing_attempts_provider_status", "provider_alias", "status", "created_at"),
    )


# =========================
# User Subscriptions
# =========================
class UserSubscription(PaymentsBase):
    __tablename__ = "user_subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid7)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    subscription_id = Column(UUID(as_uuid=True), nullable=False)
    current_period_transactions = Column(BigInteger, nullable=False, default=0)
    current_period_volume = Column(Numeric(18, 2), nullable=False, server_default="0")

    status = Column(SmallInteger, nullable=False, server_default="1")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id", "subscription_id", name="uq_user_subscriptions_user_subscription"
        ),
        Index("ix_user_subscriptions_user_id", "user_id"),
        Index("ix_user_subscriptions_subscription_id", "subscription_id"),
    )

