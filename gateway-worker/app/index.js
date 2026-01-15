import amqp from "amqplib";
import pg from "pg";
import { createClient } from "redis";

const EXCHANGE = "usage.events";
const QUEUE = "usage.tokens";
const ROUTING_KEY = "token.used";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const conn = await amqp.connect(process.env.RABBITMQ_URL);
const ch = await conn.createChannel();

await ch.assertExchange(EXCHANGE, "topic", { durable: true });

await ch.assertQueue(QUEUE, { durable: true });
await ch.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

const buffer = new Map(); // subscription_id => count

ch.consume("usage.tokens", async (msg) => {
  if (!msg) return;

  const payload = JSON.parse(msg.content.toString());
  const { event_id, subscription_id, amount } = payload;

  // idempotency check
  const seen = await redis.set(
    `event:${event_id}`,
    "1",
    { NX: true, EX: 3600 }
  );

  if (!seen) {
    ch.ack(msg);
    return;
  }

  buffer.set(
    subscription_id,
    (buffer.get(subscription_id) || 0) + amount
  );

  ch.ack(msg);
});

setInterval(async () => {
  if (!buffer.size) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const [subId, count] of buffer.entries()) {
      await client.query(
        `
        UPDATE user_subscriptions
        SET used_tokens = used_tokens + $1
        WHERE subscription_id = $2
        `,
        [count, subId]
      );
    }

    await client.query("COMMIT");
    buffer.clear();
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Flush error:", e);
  } finally {
    client.release();
  }
}, 10_000);
