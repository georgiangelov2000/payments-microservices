import express from "express";
import pg from "pg";
import crypto from "crypto";
import { createClient } from "redis";
import dotenv from "dotenv";
import httpProxy from "http-proxy";

dotenv.config();


/* ───────────────── APP ───────────────── */
const app = express();
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);


/* ───────────────── CONFIG ───────────────── */
const PORT = process.env.PORT || 3000;
const PAYMENTS_URL = process.env.PAYMENTS_URL;
const INTERNAL_WEBHOOK_SECRET = process.env.INTERNAL_WEBHOOK_SECRET;

/* ───────────────── PROXY ───────────────── */
const proxy = httpProxy.createProxyServer();

/* ───────────────── POSTGRES ───────────────── */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

/* ───────────────── REDIS ───────────────── */
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

/* ───────────────── CIRCUIT BREAKER ───────────────── */
const CB_KEY = "cb:payments";
const CB_FAILURE_THRESHOLD = 5;
const CB_OPEN_TTL = 30; // seconds

async function isCircuitOpen() {
  return (await redis.get(CB_KEY)) === "open";
}

async function recordFailure() {
  const failures = await redis.incr(`${CB_KEY}:failures`);
  if (failures >= CB_FAILURE_THRESHOLD) {
    await redis.setEx(CB_KEY, CB_OPEN_TTL, "open");
    await redis.del(`${CB_KEY}:failures`);
    console.warn("Circuit breaker OPEN (payments)");
  }
}

async function recordSuccess() {
  await redis.del(CB_KEY);
  await redis.del(`${CB_KEY}:failures`);
}

/* ───────────────── HMAC VERIFICATION ───────────────── */
function verifyInternalSignature(req) {
  const signature = req.header("x-internal-signature");
  if (!signature || !req.rawBody) return false;

  const expected = crypto
    .createHmac("sha256", INTERNAL_WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest("hex");
    
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"), // provider HMAC
      Buffer.from(expected, "hex") // gateway HMAC 
    );
  } catch {
    return false;
  }
}

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

    if (cached) {
      data = JSON.parse(cached);
      if (!data.valid) {
        return res.status(401).json({ error: "invalid_api_key" });
      }
    } else {
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
      await redis.set(`sub:${data.subscription_id}:tokens`, data.remaining);
    }

    /* ───── QUOTA ───── */
    const tokenKey = `sub:${data.subscription_id}:tokens`;
    const left = await redis.decr(tokenKey);

    if (left < 0) {
      await redis.incr(tokenKey);
      return res.status(429).json({ error: "quota_exceeded" });
    }

    /* ───── ENRICH REQUEST (NO ts) ───── */
    req.body = {
      ...req.body,
      subscription_id: data.subscription_id,
      event_id: crypto.randomUUID(),
    };

  
    req.headers["x-merchant-id"] = data.merchant_id;

    next();

  } catch (err) {
    console.error("Gateway auth error:", err);
    res.status(500).json({ error: "gateway_error" });
  }
}

/* ───────────────── PAYMENTS ROUTE (CIRCUIT BREAKER) ───────────────── */
app.all("/api/v1/payments", authMiddleware, async (req, res) => {
  if (await isCircuitOpen()) {
    return res.status(503).json({
      error: "payments_service_unavailable",
      reason: "circuit_open",
    });
  }

  try {
    proxy.web(
      req,
      res,
      {
        target: PAYMENTS_URL,
        changeOrigin: true,
        timeout: 3000,
      },
      async (err) => {
        if (err) {
          await recordFailure();

          if (!res.headersSent) {
            res.status(502).json({
              error: "payments_service_unreachable",
            });
          }
        } else {
          await recordSuccess();
        }
      }
    );
  } catch (err) {
    console.error("Payments proxy exception:", err);
    await recordFailure();

    if (!res.headersSent) {
      res.status(502).json({
        error: "payments_service_unreachable",
      });
    }
  }
});

app.post("/api/v1/payments/webhook", async (req, res) => {

  if (!verifyInternalSignature(req)) {
    return res.status(403).json({ error: "invalid_signature" });
  }

  proxy.web(
    req,
    res,
    {
      target: PAYMENTS_URL,
      changeOrigin: true,
      timeout: 3000,
    },
    (err) => {
      if (err && !res.headersSent) {
        res.status(502).json({ error: "webhook_forward_failed" });
      }
    }
  );
});

/* ───────────────── PROXY BODY FIX ───────────────── */
proxy.on("proxyReq", (proxyReq, req) => {
  if (req.body && Object.keys(req.body).length) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader("Content-Type", "application/json");
    proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
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
