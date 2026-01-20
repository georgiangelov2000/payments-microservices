import asyncio
import json
import os
import signal
import time

import aio_pika
import httpx
import redis.asyncio as redis

from app.dto.payments import PaymentDTO


# --------------------------------------------------
# Config
# --------------------------------------------------

RABBITMQ_URL = os.getenv("RABBITMQ_URL")
EXCHANGE_NAME = os.getenv("EXCHANGE_NAME")          # e.g. "payments"
QUEUE_NAME = os.getenv("QUEUE_NAME")                # e.g. "payments.merchant"
MERCHANT_CALLBACK_URL = os.getenv("MERCHANT_CALLBACK_URL")

REDIS_URL = os.getenv("REDIS_URL")

MAX_RETRIES = 5
FAIL_LIMIT = 5
BLOCK_SECONDS = 1800
RATE_LIMIT = 10


# --------------------------------------------------
# State
# --------------------------------------------------

redis_client = redis.from_url(REDIS_URL)
shutdown = False


# --------------------------------------------------
# Signal handling
# --------------------------------------------------

def handle_shutdown(*_):
    global shutdown
    shutdown = True
    print("[WORKER] Graceful shutdown requested...")


signal.signal(signal.SIGTERM, handle_shutdown)
signal.signal(signal.SIGINT, handle_shutdown)


# --------------------------------------------------
# Merchant notification
# --------------------------------------------------

async def notify_merchant(payment: PaymentDTO):
    merchant_id = payment.merchant_id

    fail_key = f"merchant:fail:{merchant_id}"
    block_key = f"merchant:block:{merchant_id}"
    rate_key = f"merchant:rate:{merchant_id}:{int(time.time() // 60)}"

    print(f"[NOTIFY] Start merchant={merchant_id} payment={payment.payment_id}")

    # Circuit breaker
    if await redis_client.exists(block_key):
        print(f"[NOTIFY] BLOCKED merchant={merchant_id}")
        raise RuntimeError("Merchant temporarily blocked")

    # Rate limiting
    current = await redis_client.incr(rate_key)
    if current == 1:
        await redis_client.expire(rate_key, 60)

    if current > RATE_LIMIT:
        print(f"[NOTIFY] RATE LIMITED merchant={merchant_id}")
        raise RuntimeError("Merchant rate limit exceeded")

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                MERCHANT_CALLBACK_URL,
                json=payment.model_dump(),
            )

        print(
            f"[NOTIFY] Response payment={payment.payment_id} "
            f"status={response.status_code}"
        )

        if response.status_code >= 500:
            raise RuntimeError("Temporary merchant failure")

        if response.status_code >= 400:
            raise ValueError("Permanent merchant error")

        # Success
        await redis_client.delete(fail_key)
        print(f"[NOTIFY] SUCCESS payment={payment.payment_id}")

    except Exception as exc:
        fails = await redis_client.incr(fail_key)
        await redis_client.expire(fail_key, BLOCK_SECONDS)

        print(
            f"[NOTIFY] FAILURE payment={payment.payment_id} "
            f"fails={fails} error={exc}"
        )

        if fails >= FAIL_LIMIT:
            await redis_client.setex(block_key, BLOCK_SECONDS, "1")
            print(f"[NOTIFY] CIRCUIT OPEN merchant={merchant_id}")

        raise


# --------------------------------------------------
# Worker
# --------------------------------------------------

async def start_worker():
    print("[WORKER] Connecting to RabbitMQ...")

    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=20)

    # Main exchange
    exchange = await channel.declare_exchange(
        EXCHANGE_NAME,
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )

    # Dead Letter Exchange (DLX)
    dlx = await channel.declare_exchange(
        f"{EXCHANGE_NAME}.dlx",
        aio_pika.ExchangeType.FANOUT,
        durable=True,
    )

    # Main queue
    queue = await channel.declare_queue(
        QUEUE_NAME,
        durable=True,
        arguments={
            "x-dead-letter-exchange": f"{EXCHANGE_NAME}.dlx",
        },
    )

    await queue.bind(exchange, routing_key="payment.*")

    # Dead Letter Queue (DLQ)
    dlq = await channel.declare_queue(
        f"{QUEUE_NAME}.dlq",
        durable=True,
    )

    await dlq.bind(dlx)

    print("[WORKER] Worker running")
    print(f"[WORKER] Queue={QUEUE_NAME}")
    print(f"[WORKER] DLQ={QUEUE_NAME}.dlq")

    async with queue.iterator() as messages:
        async for message in messages:
            if shutdown:
                print("[WORKER] Shutdown flag detected, stopping loop")
                break

            retry_count = int(message.headers.get("x-retry", 0))
            routing_key = message.routing_key

            print(
                f"[WORKER] Message received rk={routing_key} retry={retry_count}"
            )

            try:
                async with message.process(requeue=False):
                    event = json.loads(message.body)

                    payload = event.get("payload", event)
                    payment = PaymentDTO(**payload)

                    print(
                        f"[WORKER] Processing payment "
                        f"id={payment.payment_id} merchant={payment.merchant_id}"
                    )

                    # Idempotency
                    key = f"payment:event:{payment.payment_id}"
                    if await redis_client.exists(key):
                        print(
                            f"[WORKER] SKIP already processed "
                            f"payment={payment.payment_id}"
                        )
                        return

                    await notify_merchant(payment)

                    await redis_client.setex(key, 3600, "sent")
                    print(f"[WORKER] ACK payment={payment.payment_id}")

            except ValueError as exc:
                print(
                    f"[WORKER] PERMANENT FAILURE "
                    f"rk={routing_key} error={exc}"
                )
                # → auto NACK → DLQ

            except Exception as exc:
                if retry_count < MAX_RETRIES:
                    print(
                        f"[WORKER] RETRY rk={routing_key} "
                        f"{retry_count + 1}/{MAX_RETRIES} error={exc}"
                    )
                    await asyncio.sleep(2 ** retry_count)
                    message.headers["x-retry"] = retry_count + 1
                    raise
                else:
                    print(
                        f"[WORKER] DLQ rk={routing_key} "
                        f"retries_exhausted error={exc}"
                    )
                    # → auto NACK → DLQ

    print("[WORKER] Closing RabbitMQ connection")
    await connection.close()


# --------------------------------------------------
# Entrypoint
# --------------------------------------------------

if __name__ == "__main__":
    print("[WORKER] Starting payment events worker")
    asyncio.run(start_worker())

