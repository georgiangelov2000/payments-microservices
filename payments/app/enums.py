from enum import IntEnum


# ==================================================
# PAYMENT STATUS (payments.status)
# ==================================================
class PaymentStatus(IntEnum):
    PAYMENT_PENDING = 1  # Created, awaiting provider checkout
    PAYMENT_FINISHED = 2  # Successfully completed and captured
    PAYMENT_FAILED = 3  # Provider declined or all providers failed
    PAYMENT_PROCESSING = 4  # Customer submitted, awaiting provider confirmation
    PAYMENT_CANCELLED = 5  # Cancelled by customer or merchant before capture
    PAYMENT_REFUNDED = 6  # Full refund issued
    PAYMENT_PARTIALLY_REFUNDED = 7  # Partial refund issued
    PAYMENT_DISPUTED = 8  # Chargeback or dispute initiated
    PAYMENT_EXPIRED = 9  # Checkout session expired without action


# ==================================================
# SUBSCRIPTION STATUS (user_subscriptions.status)
# ==================================================
class SubscriptionStatus(IntEnum):
    SUBSCRIPTION_ACTIVE = 1
    SUBSCRIPTION_INACTIVE = 2


# ==================================================
# PAYMENT LOG EVENT TYPES (payment_logs.event_type)
# ==================================================
class PaymentLogEvent(IntEnum):
    EVENT_PAYMENT_CREATED = 1
    EVENT_PROVIDER_REQUEST_SENT = 2
    EVENT_PROVIDER_PAYMENT_ACCEPTED = 3
    EVENT_MERCHANT_NOTIFICATION_SENT = 4
    EVENT_PAYMENT_CANCELLED = 5
    EVENT_PAYMENT_REFUNDED = 6
    EVENT_PAYMENT_EXPIRED = 7
    EVENT_PAYMENT_DISPUTED = 8


# ==================================================
# OUTBOX / BROKER STATUS (payment_logs.status)
# ==================================================
class LogStatus(IntEnum):
    LOG_PENDING = 1
    LOG_SUCCESS = 2
    LOG_FAILED = 3
    LOG_RETRYING = 4
    LOG_BLOCKED = 5
    LOG_PROCESSING = 6
