import amqp from "amqplib";
import pg from "pg";
import { createClient } from "redis";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const conn = await amqp.connect(process.env.RABBITMQ_URL);
const ch = await conn.createChannel();

await ch.assertQueue("usage.tokens", { durable: true });
await ch.bindQueue("usage.tokens", "usage.events", "token.used");

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

// flush на всеки 10 секунди
setInterval(async () => {
  if (!buffer.size) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const [subId, count] of buffer.entries()) {
      await client.query(
        `
        UPDATE subscriptions
        SET used_tokens = used_tokens + $1
        WHERE id = $2
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
