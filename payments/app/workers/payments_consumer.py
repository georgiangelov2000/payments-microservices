import asyncio
import json
import os
import aio_pika
import httpx
from datetime import datetime, timedelta
from app.dto.payments import PaymentDTO
from app.db.sessions import LogsSessionLocal
from app.models.logs import PaymentLog
from sqlalchemy.orm import Session
from app.constants import (
    EVENT_MERCHANT_NOTIFICATION_SENT,
    LOG_RETRYING,
    LOG_FAILED,
    LOG_SUCCESS
)

# ---------------- Config ----------------

RABBITMQ_URL = os.getenv("RABBITMQ_URL")
EXCHANGE_NAME = os.getenv("EXCHANGE_NAME")
QUEUE_NAME = os.getenv("QUEUE_NAME")
MERCHANT_CALLBACK_URL = os.getenv("MERCHANT_CALLBACK_URL")
REDIS_URL = os.getenv("REDIS_URL")
PREFETCH_COUNT = 20
HTTP_TIMEOUT = 5.0
RETRY_DELAY_MINUTES = 30
MAX_RETRIES = 5
FAIL_THRESHOLD = 5

async def notify_merchant(payment: PaymentDTO) -> None:
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    db: Session = LogsSessionLocal()
    try:
        log = (
            db.query(PaymentLog)
            .filter(
                PaymentLog.payment_id == payment.payment_id,
                PaymentLog.event_type == EVENT_MERCHANT_NOTIFICATION_SENT,
            )
            .first()
        )

        # Idempotency guard
        if log.status == LOG_SUCCESS:
            return

        base_message = log.message or ""

        def append(msg: str) -> str:
            return f"{base_message}\n{msg}".strip()

        # ---------------- HTTP CALL ----------------
        try:
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                response = await client.post(
                    MERCHANT_CALLBACK_URL,
                    json=payment.model_dump(),
                )
        except httpx.RequestError as exc:
            retry_count = (log.retry_count or 0) + 1
            next_retry = datetime.utcnow() + timedelta(minutes=RETRY_DELAY_MINUTES)
            human_next_retry = next_retry.strftime("%Y-%m-%d %H:%M:%S")

            should_fail = retry_count % FAIL_THRESHOLD == 0

            if should_fail:
                log.status = LOG_FAILED
                log.retry_count = retry_count
                log.next_retry_at = None
                log.message = append(
                    f"[{ts}] ❌ FAILED (network error) | retries={retry_count} | error={exc}"
                )
            else:
                log.status = LOG_RETRYING
                log.retry_count = retry_count
                log.next_retry_at = next_retry
                log.message = append(
                    f"[{ts}] 🔁 RETRY (network error) | retries={retry_count} | next_retry_at={human_next_retry}"
                )

            db.commit()
            return

        # ---------------- HTTP RESPONSE ----------------
        if response.status_code not in (200, 201):
            retry_count = (log.retry_count or 0) + 1
            next_retry = datetime.utcnow() + timedelta(minutes=RETRY_DELAY_MINUTES)
            human_next_retry = next_retry.strftime("%Y-%m-%d %H:%M:%S")

            should_fail = retry_count % FAIL_THRESHOLD == 0
            
            # Fail immediately on 4xx OR every N-th retry
            if 400 <= response.status_code < 500 and should_fail:
                log.status = LOG_FAILED
                log.retry_count = retry_count
                log.next_retry_at = None
                log.message = append(
                    f"[{ts}] ❌ FAILED | status={response.status_code} | retries={retry_count}"
                )
            else:
                log.status = LOG_RETRYING
                log.retry_count = retry_count
                log.next_retry_at = next_retry
                log.message = append(
                    f"[{ts}] 🔁 RETRY | status={response.status_code} | retries={retry_count} | next_retry_at={human_next_retry}"
                )

            db.commit()
            return

        # ---------------- SUCCESS ----------------
        log.status = LOG_SUCCESS
        log.retry_count = 0
        log.next_retry_at = None
        log.message = append(
            f"[{ts}] ✅ SUCCESS | status={response.status_code}"
        )

        db.commit()

    finally:
        db.close()


async def main() -> None:
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=PREFETCH_COUNT)

    exchange = await channel.declare_exchange(
        EXCHANGE_NAME,
        aio_pika.ExchangeType.TOPIC,
        durable=True,
    )

    queue = await channel.declare_queue(QUEUE_NAME, durable=True)
    await queue.bind(exchange, routing_key="payment.*")

    while True:
        try:
            async with queue.iterator() as messages:
                async for message in messages:
                    async with message.process(requeue=False):
                        payment = PaymentDTO(**json.loads(message.body))
                        await notify_merchant(payment)

        except asyncio.CancelledError:
            # Happens on code reload / SIGTERM
            # In DEV → restart consumer
            await asyncio.sleep(1)
            continue

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
