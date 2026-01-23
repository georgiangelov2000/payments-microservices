# ==================================================
# PAYMENT STATUS (payments.status)
# ==================================================
# Lifecycle state of a payment record

PAYMENT_PENDING = 1     # Payment created, awaiting provider result
PAYMENT_FINISHED = 2    # Payment successfully completed
PAYMENT_FAILED = 3      # Payment failed or rejected


# ==================================================
# SUBSCRIPTION STATUS (user_subscriptions.status)
# ==================================================
# State of a user subscription

SUBSCRIPTION_ACTIVE = 1     # Subscription is valid and usable
SUBSCRIPTION_INACTIVE = 2   # Subscription expired or exhausted


# ==================================================
# PAYMENT LOG EVENT TYPES (payment_logs.event_type)
# ==================================================
# Source / type of the logged event

EVENT_PAYMENT_CREATED = 1               # Payment row created
EVENT_PROVIDER_REQUEST_SENT = 2         # Request sent to payment provider
EVENT_PROVIDER_PAYMENT_ACCEPTED = 3     # Provider webhook received
EVENT_MERCHANT_NOTIFICATION_SENT = 4    # Merchant callback attempted
MESSAGE_BROKER_MESSAGES = 5             # Outbox → message broker event

# ==================================================
# OUTBOX / BROKER STATUS (payment_logs.status)
# ==================================================
# Used specifically for outbox / message publishing flow

LOG_PENDING = 1        # Event created, not yet processed
LOG_SUCCESS = 2        # Successfully published / handled
LOG_FAILED = 3        # Failed permanently
LOG_RETRYING = 4       # Retry scheduled
LOG_BLOCKED = 5       # Blocked after too many failures
