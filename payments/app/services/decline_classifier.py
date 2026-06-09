"""
Decline code extraction and hard/soft classification.

Hard declines  → the payment request itself is invalid; retrying with
                 another provider will NOT succeed. Fail immediately.

Soft declines  → provider-level failures (credentials, rate limit,
                 transient errors). Try the next candidate.
"""

from __future__ import annotations

from typing import Any

# ---------------------------------------------------------------------------
# Hard decline codes – payment data is fundamentally wrong
# ---------------------------------------------------------------------------

HARD_DECLINE_CODES: frozenset[str] = frozenset(
    {
        # Card-level (post-capture — included for completeness)
        "expired_card",
        "incorrect_cvc",
        "incorrect_number",
        "invalid_card_number",
        "invalid_expiry_month",
        "invalid_expiry_year",
        "card_not_supported",
        "lost_card",
        "stolen_card",
        "fraudulent",
        "restricted_card",
        # Request-level (session creation phase)
        "amount_too_small",
        "amount_too_large",
        "currency_not_supported",
        "invalid_amount",
        "invalid_currency",
        "parameter_missing",
        "parameter_invalid_integer",
        "parameter_invalid_string",
        # Hard internal errors
        "invalid_request_error",  # Stripe type when code implies bad params
    }
)

# Stripe error types that are always hard failures regardless of code
HARD_STRIPE_TYPES: frozenset[str] = frozenset(
    {
        "invalid_request_error",
    }
)

# Stripe error codes that are explicitly soft (recoverable by routing elsewhere)
SOFT_STRIPE_CODES: frozenset[str] = frozenset(
    {
        "insufficient_funds",       # Worth trying another acquirer
        "processor_declined",       # Acquirer-specific
        "do_not_honor",             # Acquirer-specific
        "try_again_later",
        "bank_not_supported",
        "payment_method_not_available",
        "rate_limit_error",
    }
)


def extract_decline_code(exc_detail: Any) -> str:
    """
    Best-effort extraction of a structured decline code from a provider's
    exception detail (which may be a string or a dict).

    Returns a short string like ``"rate_limit_error"`` or ``"provider_error"``.
    """
    if isinstance(exc_detail, str):
        return "provider_error"

    if not isinstance(exc_detail, dict):
        return "provider_error"

    # Stripe wraps errors as: {"message": "...", "provider_error": {"error": {...}}}
    provider_error = exc_detail.get("provider_error", {})
    if isinstance(provider_error, dict):
        stripe_err = provider_error.get("error", {})
        if isinstance(stripe_err, dict):
            code = stripe_err.get("code") or stripe_err.get("type")
            if code:
                return str(code)

    # Direct error object
    code = exc_detail.get("code") or exc_detail.get("error_code")
    if code:
        return str(code)

    # PayPal-style: {"name": "VALIDATION_ERROR", ...}
    name = exc_detail.get("name")
    if name:
        return str(name).lower()

    return "provider_error"


def is_hard_decline(code: str, exc_detail: Any = None) -> bool:
    """
    Returns True if this decline code means the payment request itself is
    invalid and no further provider should be tried.
    """
    if code in HARD_DECLINE_CODES:
        # Still allow soft overrides
        if code in SOFT_STRIPE_CODES:
            return False
        return True

    # Inspect Stripe error type for hard classification
    if isinstance(exc_detail, dict):
        provider_error = exc_detail.get("provider_error", {})
        if isinstance(provider_error, dict):
            stripe_err = provider_error.get("error", {})
            if isinstance(stripe_err, dict):
                err_type = stripe_err.get("type", "")
                err_code = stripe_err.get("code", "")
                if err_type in HARD_STRIPE_TYPES and err_code not in SOFT_STRIPE_CODES:
                    return True

    return False
