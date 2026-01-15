import express from "express";
import pg from "pg";
import crypto from "crypto";
import { createClient } from "redis";
import amqp from "amqplib";
import dotenv from "dotenv";

dotenv.config();

const app = express();

/* ─────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────── */
const PORT = process.env.PORT || 3000;

const CACHE_TTL_VALID = 300;
const CACHE_TTL_INVALID = 60;

const REDIS_API_KEY_PREFIX = "api_key";
const REDIS_SUB_PREFIX = "sub";

const RABBIT_EXCHANGE = "usage.events";
const RABBIT_ROUTING_KEY = "token.used";

/* ─────────────────────────────────────────────
   POSTGRES
───────────────────────────────────────────── */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

/* ─────────────────────────────────────────────
   REDIS
───────────────────────────────────────────── */
const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.on("error", err => {
  console.error("Redis error:", err);
});

await redis.connect();

/* ─────────────────────────────────────────────
   RABBITMQ
───────────────────────────────────────────── */
let rabbitChannel = null;

async function initRabbit() {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await conn.createChannel();

    await channel.assertExchange(RABBIT_EXCHANGE, "topic", {
      durable: true,
    });

    rabbitChannel = channel;
    console.log("RabbitMQ connected");
  } catch (err) {
    console.error("RabbitMQ connection failed:", err.message);
    rabbitChannel = null;
  }
}

await initRabbit();

/* ─────────────────────────────────────────────
   VERIFY API KEY ENDPOINT
───────────────────────────────────────────── */
app.get("/verify-api-key", async (req, res) => {
  const apiKey = req.header("x-api-key");
  if (!apiKey) return res.sendStatus(401);

  const apiKeyCache = `${REDIS_API_KEY_PREFIX}:${apiKey}`;

  try {
    /* ───── REDIS CACHE HIT ───── */
    const cached = await redis.get(apiKeyCache);

    if (cached) {
      const data = JSON.parse(cached);
      if (!data.valid) return res.sendStatus(401);

      const tokenKey = `${REDIS_SUB_PREFIX}:${data.subscription_id}:tokens`;

      const remaining = await redis.decr(tokenKey);
      if (remaining < 0) {
        await redis.incr(tokenKey);
        return res.status(429).send("Token limit exceeded");
      }

      await publishTokenUsed(data.subscription_id, data.merchant_id, 1);

      res.setHeader("X-Merchant-Id", data.merchant_id);
      return res.sendStatus(200);
    }

    /* ───── DB LOOKUP ───── */
    const keyHash = crypto
      .createHash("sha256")
      .update(apiKey, "utf8")
      .digest("hex");

    const { rows } = await pool.query(
      `
      SELECT
        mak.merchant_id,
        s.id AS subscription_id,
        s.tokens,
        COALESCE(s.used_tokens, 0) AS used_tokens
      FROM merchant_api_keys mak
      JOIN subscriptions s ON s.id = mak.subscription_id
      WHERE mak.hash = $1
        AND mak.status = 'active'
      LIMIT 1
      `,
      [keyHash]
    );

    if (!rows.length) {
      await redis.setEx(
        apiKeyCache,
        CACHE_TTL_INVALID,
        JSON.stringify({ valid: false })
      );
      return res.sendStatus(401);
    }

    const { merchant_id, subscription_id, tokens, used_tokens } = rows[0];
    const remaining = tokens - used_tokens;

    /* ───── WARM REDIS ───── */
    await redis.setEx(
      apiKeyCache,
      CACHE_TTL_VALID,
      JSON.stringify({
        valid: true,
        merchant_id,
        subscription_id,
      })
    );

    const tokenKey = `${REDIS_SUB_PREFIX}:${subscription_id}:tokens`;
    await redis.set(tokenKey, remaining);

    /* ───── FIRST TOKEN CONSUME ───── */
    const after = await redis.decr(tokenKey);
    if (after < 0) {
      await redis.incr(tokenKey);
      return res.status(429).send("Token limit exceeded");
    }

    await publishTokenUsed(subscription_id, $merchant_id, 1);

    res.setHeader("X-Merchant-Id", merchant_id);
    return res.sendStatus(200);

  } catch (err) {
    console.error("Verification error:", err);
    return res.sendStatus(500);
  }
});

/* ─────────────────────────────────────────────
   HEALTH CHECK
───────────────────────────────────────────── */
app.get("/health", async (_, res) => {
  try {
    await redis.ping();
    await pool.query("SELECT 1");
    res.sendStatus(200);
  } catch {
    res.sendStatus(503);
  }
});

/* ─────────────────────────────────────────────
   RABBITMQ PRODUCER
───────────────────────────────────────────── */
async function publishTokenUsed(subscriptionId, merchant_id, count) {
  const payload = {
    event_id: crypto.randomUUID(),
    merchant_id: merchant_id,
    amount: count,
    event: "token_used",
    subscription_id: subscriptionId,
    timestamp: new Date().toISOString(),
  };

  /* Fallback ако Rabbit е down */
  if (!rabbitChannel) {
    await redis.rPush(
      "usage:fallback",
      JSON.stringify(payload)
    );
    return;
  }

  rabbitChannel.publish(
    RABBIT_EXCHANGE,
    RABBIT_ROUTING_KEY,
    Buffer.from(JSON.stringify(payload)),
    { persistent: true }
  );
}

/* ─────────────────────────────────────────────
   GRACEFUL SHUTDOWN
───────────────────────────────────────────── */
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  try {
    await redis.quit();
    await pool.end();
  } finally {
    process.exit(0);
  }
});

/* ─────────────────────────────────────────────
   START SERVER
───────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`API verification service running on :${PORT}`);
});
