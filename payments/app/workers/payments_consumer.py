import asyncio
import json
import os
import signal
import time
from typing import Optional

import aio_pika
import httpx
import redis.asyncio as redis
from sqlalchemy.orm import Session

from app.dto.payments import PaymentDTO
from app.db.sessions import LogsSessionLocal
from app.models import PaymentLog
from app.constants import (
    EVENT_MERCHANT_NOTIFICATION_SENT,
    LOG_SUCCESS,
    LOG_FAILED,
    LOG_RETRYING,
    LOG_BLOCKED,
)

# --------------------------------------------------
# Config
# --------------------------------------------------

RABBITMQ_URL = os.getenv("RABBITMQ_URL")
EXCHANGE_NAME = os.getenv("EXCHANGE_NAME")
QUEUE_NAME = os.getenv("QUEUE_NAME")
MERCHANT_CALLBACK_URL = os.getenv("MERCHANT_CALLBACK_URL")
REDIS_URL = os.getenv("REDIS_URL")

MAX_RETRIES = 5
FAIL_LIMIT = 5
BLOCK_SECONDS = 1800
RATE_LIMIT = 10

# --------------------------------------------------
# State
# --------------------------------------------------

redis_client = redis.from_url(REDIS_URL, decode_responses=True)
shutdown = False

# --------------------------------------------------
# DB logger (LOGS DB ONLY)
# --------------------------------------------------

def log_payment_event(
    *,
    payment_id: int,
    status: int,
    message: Optional[str] = None,
    payload: Optional[dict] = None,
):
    logs_db: Session = LogsSessionLocal()
    try:
        logs_db.add(
            PaymentLog(
                payment_id=payment_id,
                event_type=EVENT_MERCHANT_NOTIFICATION_SENT,
                status=status,
                message=message,
                payload=json.dumps(payload) if payload else None,
            )
        )
        logs_db.commit()
    finally:
        logs_db.close()

# --------------------------------------------------
# Signal handling
# --------------------------------------------------

def handle_shutdown(*_):
    global shutdown
    shutdown = True

signal.signal(signal.SIGTERM, handle_shutdown)
signal.signal(signal.SIGINT, handle_shutdown)

# --------------------------------------------------
# Merchant notification logic
# --------------------------------------------------

async def notify_merchant(payment: PaymentDTO):
    merchant_id = payment.merchant_id
    payment_id = payment.payment_id

    fail_key = f"merchant:fail:{merchant_id}"
    block_key = f"merchant:block:{merchant_id}"
    rate_key = f"merchant:rate:{merchant_id}:{int(time.time() // 60)}"

    # ---------------------------
    # Circuit breaker
    # ---------------------------
    if await redis_client.exists(block_key):
        log_payment_event(
            payment_id=payment_id,
            status=LOG_BLOCKED,
            message="Merchant blocked (circuit open)",
        )
        raise RuntimeError("Merchant blocked")

    # ---------------------------
    # Rate limiting (per minute)
    # ---------------------------
    current = await redis_client.incr(rate_key)
    if current == 1:
        await redis_client.expire(rate_key, 60)

    if current > RATE_LIMIT:
        log_payment_event(
            payment_id=payment_id,
            status=LOG_FAILED,
            message="Merchant rate limit exceeded",
        )
        raise RuntimeError("Rate limited")

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                MERCHANT_CALLBACK_URL,
                json=payment.model_dump(),
            )

        # ---------------------------
        # Success
        # ---------------------------
        if response.status_code < 400:
            await redis_client.delete(fail_key)

            log_payment_event(
                payment_id=payment_id,
                status=LOG_SUCCESS,
                message="Merchant notified successfully",
                payload={"status_code": response.status_code},
            )
            return

        # ---------------------------
        # Permanent failure (4xx)
        # ---------------------------
        if response.status_code < 500:
            log_payment_event(
                payment_id=payment_id,
                status=LOG_FAILED,
                message="Permanent merchant error",
                payload={"status_code": response.status_code},
            )
            raise ValueError("Permanent merchant error")

        # ---------------------------
        # Temporary failure (5xx)
        # ---------------------------
        raise RuntimeError("Temporary merchant failure")

    except Exception:
        fails = await redis_client.incr(fail_key)
        await redis_client.expire(fail_key, BLOCK_SECONDS)

        if fails >= FAIL_LIMIT:
            await redis_client.setex(block_key, BLOCK_SECONDS, "1")

            log_payment_event(
                payment_id=payment_id,
                status=LOG_BLOCKED,
                message="Merchant circuit opened",
                payload={"fails": fails},
            )
        else:
            log_payment_event(
                payment_id=payment_id,
                status=LOG_RETRYING,
                message="Retry scheduled",
                payload={"retry": fails},
            )

        raise

# --------------------------------------------------
# Worker
# --------------------------------------------------

async def start_worker():
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=20)

    exchange = await channel.declare_exchange(
        EXCHANGE_NAME,
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )

    dlx = await channel.declare_exchange(
        f"{EXCHANGE_NAME}.dlx",
        aio_pika.ExchangeType.FANOUT,
        durable=True,
    )

    queue = await channel.declare_queue(
        QUEUE_NAME,
        durable=True,
        arguments={"x-dead-letter-exchange": f"{EXCHANGE_NAME}.dlx"},
    )

    await queue.bind(exchange, routing_key="payment.*")

    dlq = await channel.declare_queue(
        f"{QUEUE_NAME}.dlq",
        durable=True,
    )
    await dlq.bind(dlx)

    async with queue.iterator() as messages:
        async for message in messages:
            if shutdown:
                break

            try:
                async with message.process(requeue=False):
                    payload = json.loads(message.body)
                    payment = PaymentDTO(**payload)
                    await notify_merchant(payment)

            except Exception:
                # exception = NACK → DLQ handled by RabbitMQ
                raise

# --------------------------------------------------
# Entrypoint
# --------------------------------------------------

if __name__ == "__main__":
    asyncio.run(start_worker())
