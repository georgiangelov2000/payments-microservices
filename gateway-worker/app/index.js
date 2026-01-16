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

ch.prefetch(1);

ch.consume(QUEUE, async (msg) => {
  if (!msg) return;

  try {
    const payload = JSON.parse(msg.content.toString());
    const { event_id, subscription_id, amount } = payload;

    // idempotency
    const seen = await redis.set(
      `event:${event_id}`,
      "1",
      { NX: true, EX: 3600 }
    );

    if (!seen) {
      ch.ack(msg);
      return;
    }

    // DURABLE WRITE
    await pool.query(
      `
      UPDATE user_subscriptions
      SET used_tokens = used_tokens + $1
      WHERE subscription_id = $2
      `,
      [amount, subscription_id]
    );

    ch.ack(msg);

  } catch (err) {
    console.error("Consumer error:", err);
    // message stays in queue → retry
    ch.nack(msg, false, true);
  }
});
