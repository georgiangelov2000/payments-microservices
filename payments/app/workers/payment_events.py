import asyncio
import json
import os
import aio_pika
import httpx

from app.dto.payments import PaymentDTO


# -------------------------
# Config
# -------------------------

RABBITMQ_URL = os.getenv(
    "RABBITMQ_URL",
    "amqp://guest:guest@rabbitmq:5672/"
)

EXCHANGE_NAME = "payments"
QUEUE_NAME = "payments.merchant"

MERCHANT_CALLBACK_URL = os.getenv(
    "MERCHANT_CALLBACK_URL",
    "http://merchants:8000/api/v1/payments/update"
)


# -------------------------
# Merchant notifier
# -------------------------

async def notify_merchant(payment: PaymentDTO):
    """
    Sends payment status update to merchant service.
    """
    async with httpx.AsyncClient(timeout=5.0) as client:
        await client.post(
            MERCHANT_CALLBACK_URL,
            json={
                "payment_id": payment.payment_id,
                "order_id": payment.order_id,
                "status": payment.status,
                "amount": payment.amount,
                "price": payment.price,
            },
        )


# -------------------------
# Worker
# -------------------------

async def start_payment_events_worker():
    """
    RabbitMQ consumer:
    - listens for payment.* events
    - forwards them to merchant service
    """

    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()

    # Optional: limit unacked messages
    await channel.set_qos(prefetch_count=10)

    exchange = await channel.declare_exchange(
        EXCHANGE_NAME,
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )

    queue = await channel.declare_queue(
        QUEUE_NAME,
        durable=True,
    )

    # Bind to all payment events
    await queue.bind(exchange, routing_key="payment.*")

    print("Payments event worker started. Waiting for messages...")

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                try:
                    payload = json.loads(message.body)

                    # Convert payload → DTO
                    payment = PaymentDTO(**payload)

                    # Forward to merchant
                    await notify_merchant(payment)

                except Exception as exc:
                    # Message will be requeued unless you nack explicitly
                    print("Error processing payment event:", exc)
                    raise


# -------------------------
# Entry point
# -------------------------

if __name__ == "__main__":
    asyncio.run(start_payment_events_worker())
