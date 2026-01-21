import asyncio
import json
import os
import signal
import time

import aio_pika
import httpx
import redis.asyncio as redis
from sqlalchemy.orm import Session

from app.dto.payments import PaymentDTO
from app.db import SessionLocal
from app.models import PaymentLog


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
# Event + Status constants
# --------------------------------------------------

EVENT_MERCHANT_NOTIFICATION_SENT = 4

STATUS_SUCCESS = 1
STATUS_FAILED = 2
STATUS_RETRYING = 3
STATUS_BLOCKED = 4


# --------------------------------------------------
# State
# --------------------------------------------------

redis_client = redis.from_url(REDIS_URL)
shutdown = False


# --------------------------------------------------
# DB logger
# --------------------------------------------------

def log_payment_event(
    *,
    payment_id: int,
    status: int,
    message: str | None = None,
    payload: dict | None = None,
):
    db: Session = SessionLocal()
    try:
        db.add(
            PaymentLog(
                payment_id=payment_id,
                event_type=EVENT_MERCHANT_NOTIFICATION_SENT,
                status=status,
                message=message,
                payload=json.dumps(payload) if payload else None,
            )
        )
        db.commit()
    finally:
        db.close()


# --------------------------------------------------
# Signal handling
# --------------------------------------------------

def handle_shutdown(*_):
    global shutdown
    shutdown = True


signal.signal(signal.SIGTERM, handle_shutdown)
signal.signal(signal.SIGINT, handle_shutdown)


# --------------------------------------------------
# Merchant notification
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
            status=STATUS_BLOCKED,
            message="Merchant blocked (circuit open)",
        )
        raise RuntimeError("Merchant blocked")

    # ---------------------------
    # Rate limiting
    # ---------------------------
    current = await redis_client.incr(rate_key)
    if current == 1:
        await redis_client.expire(rate_key, 60)

    if current > RATE_LIMIT:
        log_payment_event(
            payment_id=payment_id,
            status=STATUS_FAILED,
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
        # SUCCESS
        # ---------------------------
        if response.status_code < 400:
            await redis_client.delete(fail_key)

            log_payment_event(
                payment_id=payment_id,
                status=STATUS_SUCCESS,
                message="Merchant notified successfully",
                payload={"status_code": response.status_code},
            )
            return

        # ---------------------------
        # PERMANENT FAILURE
        # ---------------------------
        if response.status_code < 500:
            log_payment_event(
                payment_id=payment_id,
                status=STATUS_FAILED,
                message="Permanent merchant error",
                payload={"status_code": response.status_code},
            )
            raise ValueError("Permanent merchant error")

        # ---------------------------
        # TEMPORARY FAILURE
        # ---------------------------
        raise RuntimeError("Temporary merchant failure")

    except Exception:
        fails = await redis_client.incr(fail_key)
        await redis_client.expire(fail_key, BLOCK_SECONDS)

        if fails >= FAIL_LIMIT:
            await redis_client.setex(block_key, BLOCK_SECONDS, "1")

            log_payment_event(
                payment_id=payment_id,
                status=STATUS_BLOCKED,
                message="Merchant circuit opened",
                payload={"fails": fails},
            )
        else:
            log_payment_event(
                payment_id=payment_id,
                status=STATUS_RETRYING,
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
            retry_count = int(message.headers.get("x-retry", 0))

            try:
                async with message.process(requeue=False):
                    payment = PaymentDTO(**json.loads(message.body))
                    await notify_merchant(payment)

            except ValueError:
                pass  # permanent failure → DLQ

            except Exception:
                if retry_count < MAX_RETRIES:
                    message.headers["x-retry"] = retry_count + 1
                    await asyncio.sleep(2 ** retry_count)
                    raise
                else:
                    pass  # retries exhausted → DLQ

    await connection.close()


# --------------------------------------------------
# Entrypoint
# --------------------------------------------------

if __name__ == "__main__":
    asyncio.run(start_worker())
