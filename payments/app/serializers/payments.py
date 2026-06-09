from app.json_types import JsonObject
from app.models.payments import Payment as PaymentModel


def payment_to_dict(payment: PaymentModel) -> JsonObject:
    return {
        "payment_id": str(payment.id),
        "order_id": int(payment.order_id),
        "merchant_id": str(payment.merchant_id),
        "status": int(payment.status.value),
        "price": str(payment.price),
        "currency": str(payment.currency),
        "country": str(payment.country) if payment.country else None,
        "locale": str(payment.locale) if payment.locale else None,
        "channel": str(payment.channel) if payment.channel else None,
    }
