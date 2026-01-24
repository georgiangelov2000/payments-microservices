import asyncio
import os
from datetime import datetime, timedelta

import aio_pika
from sqlalchemy import update, or_
from sqlalchemy.orm import Session

from app.db.sessions import LogsSessionLocal
from app.models.logs import PaymentLog
from app.constants import (
    EVENT_MERCHANT_NOTIFICATION_SENT,
    LOG_PENDING,
    LOG_PROCESSING,
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

FAIL_THRESHOLD = 5
RETRY_DELAY_MINUTES = 30


# ==================================================
# RabbitMQ publish
# ==================================================

async def publish(exchange: aio_pika.Exchange, payload: str) -> None:
    await exchange.publish(
        aio_pika.Message(
            body=payload.encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        ),
        routing_key="payment.updated",
    )


# ==================================================
# Timeline helper
# ==================================================

def append_message(log: PaymentLog, text: str) -> None:
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"[{ts}] {text}"
    log.message = f"{log.message}\n{entry}" if log.message else entry


# ==================================================
# Producer loop
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
        logs_db: Session = LogsSessionLocal()

        try:
            now = datetime.utcnow()

            # --------------------------------------------------
            # ATOMIC CLAIM (safe for multiple workers)
            # --------------------------------------------------
            stmt = (
                update(PaymentLog)
                .where(PaymentLog.event_type == EVENT_MERCHANT_NOTIFICATION_SENT)
                .where(PaymentLog.status.in_([LOG_PENDING, LOG_RETRYING]))
                .where(
                    or_(
                        PaymentLog.next_retry_at.is_(None),
                        PaymentLog.next_retry_at <= now,
                    )
                )
                .values(status=LOG_PROCESSING)
                .returning(PaymentLog)
                .execution_options(synchronize_session=False)
            )

            events = logs_db.execute(stmt).scalars().all()
            logs_db.commit()

            # --------------------------------------------------
            # Publish events
            # --------------------------------------------------
            for event in events:
                try:
                    await publish(exchange, event.payload)
                    append_message(event, "✅ Published to RabbitMQ")

                except Exception as exc:
                    event.retry_count += 1

                    should_fail = event.retry_count % FAIL_THRESHOLD == 0
                    next_retry = datetime.utcnow() + timedelta(minutes=RETRY_DELAY_MINUTES)
                    human_next_retry = next_retry.strftime("%Y-%m-%d %H:%M:%S")

                    if should_fail:
                        event.status = LOG_FAILED
                        event.next_retry_at = None
                        append_message(
                            event,
                            f"❌ FAILED (publish error) | retries={event.retry_count} | error={exc}",
                        )
                    else:
                        event.status = LOG_RETRYING
                        event.next_retry_at = next_retry
                        append_message(
                            event,
                            f"🔁 RETRY scheduled (publish) | retries={event.retry_count} | next_retry_at={human_next_retry}",
                        )

            logs_db.commit()

        finally:
            logs_db.close()

        await asyncio.sleep(POLL_INTERVAL)


# ==================================================
# Entrypoint
# ==================================================

if __name__ == "__main__":
    asyncio.run(start_producer())
