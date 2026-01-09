import asyncio
import json
import os
import signal
import aio_pika
import httpx
import redis.asyncio as redis

from app.dto.payments import PaymentDTO

RABBITMQ_URL = os.getenv("RABBITMQ_URL")
EXCHANGE_NAME = os.getenv("EXCHANGE_NAME")
QUEUE_NAME = os.getenv("QUEUE_NAME")
MERCHANT_CALLBACK_URL = os.getenv("MERCHANT_CALLBACK_URL")

REDIS_URL = os.getenv("REDIS_URL")
MAX_RETRIES = 5

redis_client = redis.from_url(REDIS_URL)

shutdown = False


def handle_shutdown(*_):
    global shutdown
    shutdown = True
    print("Graceful shutdown requested...")


signal.signal(signal.SIGTERM, handle_shutdown)
signal.signal(signal.SIGINT, handle_shutdown)


async def notify_merchant(payment: PaymentDTO):
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.post(
            MERCHANT_CALLBACK_URL,
            json=payment.model_dump(),
        )

        if response.status_code >= 500:
            raise RuntimeError("Merchant temporary failure")

        if response.status_code >= 400:
            raise ValueError("Merchant rejected payload")


async def start_worker():
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=20)

    exchange = await channel.declare_exchange(
        EXCHANGE_NAME,
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )

    queue = await channel.declare_queue(
        QUEUE_NAME,
        durable=True,
        arguments={
            "x-dead-letter-exchange": f"{EXCHANGE_NAME}.dlx"
        },
    )

    await queue.bind(exchange, routing_key="payment.*")

    print("Payment worker running")

    async with queue.iterator() as messages:
        async for message in messages:
            if shutdown:
                break

            retry_count = int(message.headers.get("x-retry", 0))

            async with message.process(ignore_processed=True):
                try:
                    event = json.loads(message.body)
                    payment = PaymentDTO(**event["payload"])

                    #Idempotency
                    key = f"payment:event:{payment.payment_id}"
                    if await redis_client.exists(key):
                        message.ack()
                        continue

                    await notify_merchant(payment)

                    await redis_client.setex(key, 3600, "sent")
                    message.ack()

                except ValueError:
                    # permanent failure
                    message.nack(requeue=False)

                except Exception as exc:
                    if retry_count >= MAX_RETRIES:
                        message.nack(requeue=False)
                    else:
                        await asyncio.sleep(2 ** retry_count)
                        message.headers["x-retry"] = retry_count + 1
                        message.nack(requeue=True)

    await connection.close()


if __name__ == "__main__":
    asyncio.run(start_worker())
