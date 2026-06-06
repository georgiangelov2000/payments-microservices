import logging
import os

import aio_pika
from aio_pika.abc import AbstractChannel, AbstractExchange, AbstractRobustConnection
from aio_pika.exceptions import DeliveryError

from app.dto.payments import PaymentDTO

logger = logging.getLogger(__name__)


# -------------------------
# Config
# -------------------------

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")

EXCHANGE_NAME = "payments"


# -------------------------
# Connection state (shared)
# -------------------------

_connection: AbstractRobustConnection | None = None
_channel: AbstractChannel | None = None
_exchange: AbstractExchange | None = None


# -------------------------
# Lifecycle
# -------------------------


async def connect() -> None:
    global _connection, _channel, _exchange

    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    _connection = connection

    # ENABLE PUBLISHER CONFIRMS
    channel = await connection.channel(publisher_confirms=True)
    _channel = channel

    _exchange = await channel.declare_exchange(
        EXCHANGE_NAME,
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )


async def close() -> None:
    global _connection

    if _connection:
        await _connection.close()


# -------------------------
# Publisher (DTO-based)
# -------------------------


async def publish_payment_event(payment: PaymentDTO) -> None:
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

        logger.info(
            "Published payment event",
            extra={
                "confirmed": confirmed,
                "payment_id": payment.payment_id,
                "status": payment.status,
                "routing_key": routing_key,
            },
        )

    except DeliveryError:
        logger.exception(
            "Payment event was unroutable",
            extra={"payment_id": payment.payment_id, "routing_key": routing_key},
        )
        raise

    except Exception as exc:
        logger.exception(
            "Failed to publish payment event",
            extra={
                "payment_id": payment.payment_id,
                "routing_key": routing_key,
                "error": str(exc),
            },
        )
        raise
