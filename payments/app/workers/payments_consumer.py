# app/workers/payments_consumer.py

import asyncio
import json
import os
import signal
import time
from datetime import datetime
from typing import Optional

import aio_pika
import httpx
import redis.asyncio as redis
from sqlalchemy.orm import Session

from app.dto.payments import PaymentDTO
from app.db.sessions import LogsSessionLocal
from app.models.logs import PaymentLog
from app.constants import (
    EVENT_MERCHANT_NOTIFICATION_SENT,
    LOG_PROCESSING,
    LOG_RETRYING,
    LOG_SUCCESS,
    LOG_FAILED,
    LOG_BLOCKED
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
BLOCK_SECONDS = 1800
RATE_LIMIT = 5

redis_client = redis.from_url(REDIS_URL, decode_responses=True)
shutdown = False

# --------------------------------------------------
# Helpers
# --------------------------------------------------

def append_merchant_log(
    *,
    payment_id: int,
    status: int,
    message: str,
) -> None:
    logs_db: Session = LogsSessionLocal()
    try:
        log = (
            logs_db.query(PaymentLog)
            .filter(
                PaymentLog.payment_id == payment_id,
                PaymentLog.event_type == EVENT_MERCHANT_NOTIFICATION_SENT,
            )
            .one()
        )

        ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        entry = f"[{ts}] {message}"

        log.message = f"{log.message}\n{entry}" if log.message else entry
        log.status = status

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

async def notify_merchant(payment: PaymentDTO) -> None:
    merchant_id = payment.merchant_id
    payment_id = payment.payment_id

    fail_key = f"merchant:fail:{merchant_id}"
    block_key = f"merchant:block:{merchant_id}"
    rate_key = f"merchant:rate:{merchant_id}:{int(time.time() // 60)}"

    # Circuit breaker
    if await redis_client.exists(block_key):
        append_merchant_log(
            payment_id=payment_id,
            status=LOG_BLOCKED,
            message="Merchant blocked (circuit open)",
        )
        return

    # Rate limiting
    current = await redis_client.incr(rate_key)
    if current == 1:
        await redis_client.expire(rate_key, 60)

    if current > RATE_LIMIT:
        append_merchant_log(
            payment_id=payment_id,
            status=LOG_RETRYING,
            message="Merchant rate limit exceeded",
        )
        return

    try:
        append_merchant_log(
            payment_id=payment_id,
            status=LOG_PROCESSING,
            message="Sending request to merchant API",
        )

        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                MERCHANT_CALLBACK_URL,
                json=payment.model_dump(),
            )

        # SUCCESS
        if response.status_code < 400:
            await redis_client.delete(fail_key)

            append_merchant_log(
                payment_id=payment_id,
                status=LOG_SUCCESS,
                message=f"Merchant API responded successfully ({response.status_code})",
            )
            return

    except Exception:
        fails = await redis_client.incr(fail_key)
        await redis_client.expire(fail_key, BLOCK_SECONDS)

        if fails >= MAX_RETRIES:
            await redis_client.setex(block_key, BLOCK_SECONDS, "1")

            append_merchant_log(
                payment_id=payment_id,
                status=LOG_FAILED,
                message=f"Merchant notification failed permanently after {fails} attempts",
            )
        else:
            append_merchant_log(
                payment_id=payment_id,
                status=LOG_RETRYING,
                message=f"Merchant API not available – retry scheduled ({fails}/{MAX_RETRIES})",
            )

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

    queue = await channel.declare_queue(QUEUE_NAME, durable=True)
    await queue.bind(exchange, routing_key="payment.*")

    async with queue.iterator() as messages:
        async for message in messages:
            if shutdown:
                break

            async with message.process(requeue=False):
                try:
                    payload = json.loads(message.body)
                    payment = PaymentDTO(**payload)
                    await notify_merchant(payment)
                except Exception as e:
                    print(f"[ERROR] Consumer error: {e}")

# --------------------------------------------------
# Entrypoint
# --------------------------------------------------

if __name__ == "__main__":
    asyncio.run(start_worker())
