import express from "express";
import pg from "pg";
import crypto from "crypto";
import { createClient } from "redis";
import "dotenv/config";

const app = express();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

const redis = createClient({
  url: process.env.REDIS_URL
});

redis.on("error", err => {
  console.error("Redis error:", err);
});

await redis.connect();

const CACHE_TTL_VALID = 300;     // 5 min
const CACHE_TTL_INVALID = 60;    // 1 min
const REDIS_PREFIX = "api_key";

/* ─────────────────────────────────────────────
   Verification endpoint (NGINX auth_request)
───────────────────────────────────────────── */
app.get("/verify-api-key", async (req, res) => {
  const apiKey = req.header("x-api-key");
  
  if (!apiKey) {
    return res.sendStatus(401);
  }

  const redisKey = `${REDIS_PREFIX}:${apiKey}`;

  try {
    const cached = await redis.get(redisKey);
    if (cached && JSON.parse(cached).valid) {
      const data = JSON.parse(cached);

      if (!data.valid) {
        return res.sendStatus(401);
      }

      // Optionally forward merchant_id to upstream
      res.setHeader("X-Merchant-Id", data.merchant_id);
      return res.sendStatus(200);
    }

    const keyHash = crypto
    .createHash("sha256")
    .update(apiKey, "utf8")
    .digest("hex");
    
    const { rows } = await pool.query(
      `
      SELECT merchant_id
      FROM merchant_api_keys
      WHERE hash = $1
        AND now() >= start_date
        AND now() <= end_date
      LIMIT 1
      `,
      [keyHash]
    );

    if (rows.length === 0) {
      // Negative cache (important for brute-force protection)
      await redis.setEx(
        redisKey,
        CACHE_TTL_INVALID,
        JSON.stringify({ valid: false })
      );

      return res.sendStatus(401);
    }

    const merchantId = rows[0].merchant_id;

    /* Cache positive result ───── */
    await redis.setEx(
      redisKey,
      CACHE_TTL_VALID,
      JSON.stringify({
        valid: true,
        merchant_id: merchantId
      })
    );

    // Pass merchant_id upstream if you want
    res.setHeader("X-Merchant-Id", merchantId);
    return res.sendStatus(200);

  } catch (err) {
    console.error("Auth verification error:", err);
    return res.sendStatus(500);
  }
});

/* ─────────────────────────────────────────────
   Health check (important for NGINX / Docker)
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
   Start server
───────────────────────────────────────────── */
app.listen(3000, () => {
  console.log("API verification service running on :3000");
});
