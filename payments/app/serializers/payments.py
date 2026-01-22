from app.models.payments import Payment as PaymentModel


def payment_to_dict(payment: PaymentModel) -> dict:
    return {
        "payment_id": payment.id,
        "order_id": payment.order_id,
        "merchant_id": payment.merchant_id,
        "status": payment.status.value,
        "amount": str(payment.amount),
        "price": str(payment.price),
    }
