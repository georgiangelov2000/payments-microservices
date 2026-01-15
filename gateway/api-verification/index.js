import express from "express";
import pg from "pg";
import crypto from "crypto";
import { createClient } from "redis";
import amqp from "amqplib";
import dotenv from "dotenv";

dotenv.config();

const app = express();

/* ─────────────────────────────────────────────
   PostgreSQL
───────────────────────────────────────────── */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

/* ─────────────────────────────────────────────
   Redis
───────────────────────────────────────────── */
const redis = createClient({
  url: process.env.REDIS_URL
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

await redis.connect();

/* ─────────────────────────────────────────────
   RabbitMQ
───────────────────────────────────────────── */
const RABBIT_URL = process.env.RABBITMQ_URL;
const EXCHANGE = "usage.events";

let rabbitChannel;

async function initRabbit() {
  const conn = await amqp.connect(RABBIT_URL);
  const channel = await conn.createChannel();

  await channel.assertExchange(EXCHANGE, "topic", {
    durable: true
  });

  rabbitChannel = channel;
  console.log("RabbitMQ connected");
}

await initRabbit();

/* ─────────────────────────────────────────────
   Config
───────────────────────────────────────────── */
const CACHE_TTL_VALID = 300;
const CACHE_TTL_INVALID = 60;

const REDIS_API_KEY_PREFIX = "api_key";
const REDIS_SUB_PREFIX = "sub";

/* ─────────────────────────────────────────────
   VERIFY API KEY + TOKENS
───────────────────────────────────────────── */
app.get("/verify-api-key", async (req, res) => {
  const apiKey = req.header("x-api-key");
  if (!apiKey) return res.sendStatus(401);

  const apiKeyCache = `${REDIS_API_KEY_PREFIX}:${apiKey}`;

  try {
    /* REDIS CACHE */
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

      publishTokenUsed(data.subscription_id, 1);

      res.setHeader("X-Merchant-Id", data.merchant_id);
      return res.sendStatus(200);
    }

    /* HASH API KEY */
    const keyHash = crypto
      .createHash("sha256")
      .update(apiKey, "utf8")
      .digest("hex");

    /* DB QUERY */
    const { rows } = await pool.query(
      `
      SELECT
        mak.merchant_id,
        s.id AS subscription_id,
        s.tokens
      FROM merchant_api_keys mak
      JOIN subscriptions s ON s.id = mak.subscription_id
      WHERE mak.hash = $1
        AND mak.status = $2
      LIMIT 1
      `,
      [keyHash, "active"]
    );

    if (rows.length === 0) {
      await redis.setEx(
        apiKeyCache,
        CACHE_TTL_INVALID,
        JSON.stringify({ valid: false })
      );
      return res.sendStatus(401);
    }

    const { merchant_id, subscription_id, tokens } = rows[0];

    /* WARM REDIS */
    await redis.setEx(
      apiKeyCache,
      CACHE_TTL_VALID,
      JSON.stringify({
        valid: true,
        merchant_id,
        subscription_id
      })
    );

    const tokenKey = `${REDIS_SUB_PREFIX}:${subscription_id}:tokens`;
    await redis.set(tokenKey, tokens);

    /* FIRST TOKEN CONSUME */
    const remaining = await redis.decr(tokenKey);
    if (remaining < 0) {
      await redis.incr(tokenKey);
      return res.status(429).send("Token limit exceeded");
    }

    publishTokenUsed(subscription_id, 1);

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
   START SERVER
───────────────────────────────────────────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API verification service running on :${PORT}`);
});

/* ─────────────────────────────────────────────
   RABBITMQ PRODUCER
───────────────────────────────────────────── */
function publishTokenUsed(subscriptionId, count) {
  if (!rabbitChannel) return;

  const payload = {
    event: "token_used",
    subscription_id: subscriptionId,
    amount: count,
    timestamp: new Date().toISOString()
  };

  rabbitChannel.publish(
    EXCHANGE,
    "token.used",
    Buffer.from(JSON.stringify(payload)),
    { persistent: true }
  );
}
