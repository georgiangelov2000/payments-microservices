import os
import aio_pika
from typing import Optional

from app.dto.payments import PaymentDTO


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
    global _connection, _channel, _exchange

    _connection = await aio_pika.connect_robust(RABBITMQ_URL)

    # ENABLE PUBLISHER CONFIRMS
    _channel = await _connection.channel(publisher_confirms=True)

    _exchange = await _channel.declare_exchange(
        EXCHANGE_NAME,
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )


async def close():
    global _connection

    if _connection:
        await _connection.close()


# -------------------------
# Publisher (DTO-based)
# -------------------------

async def publish_payment_event(payment: PaymentDTO):
    """
    Publishes a payment event to RabbitMQ WITH confirmation.
    Requires `connect()` to have been called.
    """
    if not _exchange:
        raise RuntimeError("RabbitMQ is not connected")

    message = aio_pika.Message(
        body=payment.model_dump_json().encode(),
        content_type="application/json",
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
    )

    routing_key = f"payment.{payment.status}"

    try:
        confirmed = await _exchange.publish(
            message,
            routing_key=routing_key,
            mandatory=True,  # detect unroutable messages
        )

        print(
            f"[PUBLISH] CONFIRMED={confirmed} "
            f"id={payment.payment_id} "
            f"status={payment.status} "
            f"rk={routing_key}"
        )

    except aio_pika.exceptions.UnroutableError:
        print(
            f"[PUBLISH] UNROUTABLE "
            f"id={payment.payment_id} "
            f"rk={routing_key}"
        )
        raise

    except Exception as exc:
        print(
            f"[PUBLISH] FAILED "
            f"id={payment.payment_id} "
            f"rk={routing_key} "
            f"error={exc}"
        )
        raise
