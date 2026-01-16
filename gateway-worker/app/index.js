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

  const client = await pool.connect();

  try {
    const payload = JSON.parse(msg.content.toString());
    const {
      event_id,
      subscription_id,
      merchant_id,
      amount,
      ts
    } = payload;

    // idempotency
    const seen = await redis.set(
      `event:${event_id}`,
      "1",
      { NX: true, EX: 3600 }
    );

    if (!seen) {
      ch.ack(msg);
      client.release();
      return;
    }

    // DB TRANSACTION
    await client.query("BEGIN");

    // 1update tokens
    await client.query(
      `
        UPDATE user_subscriptions us
        SET
          used_tokens = used_tokens + $1,
          status = CASE
            WHEN used_tokens + $1 >= s.tokens THEN 'inactive'
            ELSE us.status
          END
        FROM subscriptions s
        WHERE us.subscription_id = $2
          AND s.id = us.subscription_id
        RETURNING us.status;
      `,
      [amount, subscription_id]
    );

    // insert api request log
    await client.query(
      `
      INSERT INTO api_requests
        (event_id, subscription_id, user_id, amount, ts, source)
      VALUES
        ($1, $2, $3, $4, $5, 'gateway')
      `,
      [event_id, subscription_id, merchant_id, amount, ts]
    );

    await client.query("COMMIT");

    ch.ack(msg);

  } catch (err) {
    await client.query("ROLLBACK");
    client.release();

    console.error("Consumer error:", err);

    // retry
    ch.nack(msg, false, true);
    return;
  }

  client.release();
});

