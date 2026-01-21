import asyncio
import os
from datetime import datetime, timedelta

import aio_pika
from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import PaymentLog
from app.enums import (
    EVENT_MESSAGE_BROKER,
    LOG_PENDING,
    LOG_SUCCESS,
    LOG_FAILED,
    LOG_RETRYING,
)

# ==================================================
# Config
# ==================================================

RABBITMQ_URL = os.getenv("RABBITMQ_URL")
EXCHANGE_NAME = os.getenv("EXCHANGE_NAME", "payments")

POLL_INTERVAL = 1
BATCH_SIZE = 50
MAX_RETRIES = 5

# ==================================================
# RabbitMQ publish
# ==================================================

async def publish(exchange, payload: str):
    await exchange.publish(
        aio_pika.Message(
            body=payload.encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        ),
        routing_key="payment.updated",
    )

# ==================================================
# Producer loop (OUTBOX pattern)
# ==================================================

async def start_producer():
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()

    exchange = await channel.declare_exchange(
        EXCHANGE_NAME,
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )

    while True:
        db: Session = SessionLocal()
        try:
            events = (
                db.execute(
                    select(PaymentLog)
                    .where(PaymentLog.event_type == EVENT_MESSAGE_BROKER)
                    .where(
                        PaymentLog.status.in_([LOG_PENDING, LOG_RETRYING])
                    )
                    .where(
                        or_(
                            PaymentLog.next_retry_at == None,
                            PaymentLog.next_retry_at <= datetime.utcnow(),
                        )
                    )
                    .with_for_update(skip_locked=True)
                    .limit(BATCH_SIZE)
                )
                .scalars()
                .all()
            )

            for event in events:
                try:
                    await publish(exchange, event.payload)

                    event.status = LOG_SUCCESS
                    event.message = "Published to RabbitMQ"

                except Exception:
                    event.retry_count += 1

                    if event.retry_count >= MAX_RETRIES:
                        event.status = LOG_FAILED
                        event.message = "Publishing failed permanently"
                    else:
                        event.status = LOG_RETRYING
                        event.next_retry_at = datetime.utcnow() + timedelta(
                            seconds=2 ** event.retry_count
                        )
                        event.message = "Retry scheduled"

            db.commit()

        finally:
            db.close()

        await asyncio.sleep(POLL_INTERVAL)

# ==================================================
# Entrypoint
# ==================================================

if __name__ == "__main__":
    asyncio.run(start_producer())
