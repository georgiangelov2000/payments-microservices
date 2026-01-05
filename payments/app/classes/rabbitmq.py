import os
import json
import aio_pika
from typing import Optional

from app.models import Payment as PaymentModel


# -------------------------
# Config
# -------------------------

RABBITMQ_URL = os.getenv(
    "RABBITMQ_URL",
    "amqp://guest:guest@rabbitmq:5672/"
)

EXCHANGE_NAME = "payments"


# -------------------------
# Connection state (shared)
# -------------------------

_connection: Optional[aio_pika.RobustConnection] = None
_channel: Optional[aio_pika.RobustChannel] = None
_exchange: Optional[aio_pika.RobustExchange] = None


# -------------------------
# Lifecycle
# -------------------------

async def connect():
    """
    Called once on FastAPI startup.
    Creates a persistent RabbitMQ connection.
    """
    global _connection, _channel, _exchange

    _connection = await aio_pika.connect_robust(RABBITMQ_URL)
    _channel = await _connection.channel()

    _exchange = await _channel.declare_exchange(
        EXCHANGE_NAME,
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )


async def close():
    """
    Called once on FastAPI shutdown.
    """
    global _connection

    if _connection:
        await _connection.close()


# -------------------------
# Publisher
# -------------------------

async def publish_payment_event(payment: PaymentModel):
    """
    Publishes a payment event to RabbitMQ.
    Requires `connect()` to have been called.
    """
    if not _exchange:
        raise RuntimeError("RabbitMQ is not connected")

    message = aio_pika.Message(
        body=json.dumps(
            {
                "payment_id": payment.id,
                "order_id": payment.order_id,
                "merchant_id": payment.merchant_id,
                "amount": payment.amount,
                "price": payment.price,
                "status": payment.status.value,
            }
        ).encode(),
        content_type="application/json",
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
    )

    routing_key = f"payment.{payment.status.value}"

    await _exchange.publish(
        message,
        routing_key=routing_key,
    )
