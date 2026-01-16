import express from "express";
import pg from "pg";
import crypto from "crypto";
import { createClient } from "redis";
import dotenv from "dotenv";
import httpProxy from "http-proxy";

dotenv.config();

/* ───────────────── APP ───────────────── */
const app = express();
app.use(express.json());

/* ───────────────── CONFIG ───────────────── */
const PORT = process.env.PORT || 3000;
const PAYMENTS_URL = process.env.PAYMENTS_URL;

/* ───────────────── PROXY ───────────────── */
const proxy = httpProxy.createProxyServer();

/* ───────────────── POSTGRES ───────────────── */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

/* ───────────────── REDIS ───────────────── */
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

/* ───────────────── AUTH + QUOTA MIDDLEWARE ───────────────── */
async function authMiddleware(req, res, next) {
  const apiKey = req.header("x-api-key");
  if (!apiKey) {
    return res.status(401).json({ error: "missing_api_key" });
  }

  const cacheKey = `api_key:${apiKey}`;

  try {
    let data;
    const cached = await redis.get(cacheKey);

    /* ───── CACHE ───── */
    if (cached) {
      data = JSON.parse(cached);
      if (!data.valid) {
        return res.status(401).json({ error: "invalid_api_key" });
      }
    } else {
      /* ───── DB ───── */
      const hash = crypto
        .createHash("sha256")
        .update(apiKey, "utf8")
        .digest("hex");

      const { rows } = await pool.query(
        `
        SELECT
          mak.merchant_id,
          us.subscription_id,
          s.tokens,
          us.used_tokens
        FROM merchant_api_keys mak
        JOIN user_subscriptions us ON us.user_id = mak.merchant_id
        JOIN subscriptions s ON s.id = us.subscription_id
        WHERE mak.hash = $1
          AND mak.status = 'active'
          AND us.status = 'active'
        LIMIT 1
        `,
        [hash]
      );

      if (!rows.length) {
        await redis.setEx(cacheKey, 60, JSON.stringify({ valid: false }));
        return res.status(401).json({ error: "invalid_api_key" });
      }

      const row = rows[0];

      data = {
        valid: true,
        merchant_id: row.merchant_id,
        subscription_id: row.subscription_id,
        remaining: row.tokens - row.used_tokens,
      };

      await redis.setEx(cacheKey, 300, JSON.stringify(data));
      await redis.set(
        `sub:${data.subscription_id}:tokens`,
        data.remaining
      );
    }

    /* ───── QUOTA ───── */
    const tokenKey = `sub:${data.subscription_id}:tokens`;
    const left = await redis.decr(tokenKey);

    if (left < 0) {
      await redis.incr(tokenKey);
      return res.status(429).json({ error: "quota_exceeded" });
    }

    /* ───── CONTEXT ───── */
    req.headers["x-merchant-id"] = data.merchant_id;
    next();

  } catch (err) {
    console.error("GATEWAY ERROR:", err);
    return res.status(500).json({ error: "gateway_error" });
  }
}

/* ───────────────── PAYMENTS ROUTE ───────────────── */
app.all("/api/v1/payments*", authMiddleware, (req, res) => {
  proxy.web(req, res, {
    target: PAYMENTS_URL,
    changeOrigin: true,
  });
});

/* ───────────────── FIX: BODY → PROXY ───────────────── */
proxy.on("proxyReq", (proxyReq, req) => {
  if (req.body && Object.keys(req.body).length) {
    const bodyData = JSON.stringify(req.body);

    proxyReq.setHeader("Content-Type", "application/json");
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
});

/* ───────────────── PROXY ERROR ───────────────── */
proxy.on("error", (err, req, res) => {
  console.error("Proxy error:", err.message);

  if (!res.headersSent) {
    res.status(502).json({
      error: "payments_service_unreachable",
    });
  }
});

/* ───────────────── HEALTH ───────────────── */
app.get("/health", async (_, res) => {
  try {
    await redis.ping();
    await pool.query("SELECT 1");
    res.sendStatus(200);
  } catch {
    res.sendStatus(503);
  }
});

/* ───────────────── START ───────────────── */
app.listen(PORT, () => {
  console.log(`Application Gateway running on :${PORT}`);
});
