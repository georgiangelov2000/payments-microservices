import express from "express";
import pg from "pg";
import crypto from "crypto";
import { createClient } from "redis";
import dotenv from "dotenv";
import httpProxy from "http-proxy";
import helmet from "helmet";

dotenv.config();

/* ───────────────── APP ───────────────── */
const app = express();

/* ───────────────── SECURITY ───────────────── */
app.use(helmet());
app.disable("x-powered-by");

app.use(express.json({
  limit: "256kb",
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

/* ───────────────── REQUEST ID ───────────────── */
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader("X-Request-ID", req.id);
  next();
});

/* ───────────────── CONFIG ───────────────── */
const PORT = process.env.PORT || 3000;
const PAYMENTS_URL = process.env.PAYMENTS_URL;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const INTERNAL_WEBHOOK_SECRET = process.env.INTERNAL_WEBHOOK_SECRET;

/* ───────────────── PROXY ───────────────── */
const proxy = httpProxy.createProxyServer({
  proxyTimeout: 3000,
});

/* ───────────────── POSTGRES ───────────────── */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

/* ───────────────── REDIS ───────────────── */
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

/* ───────────────── CIRCUIT BREAKER ───────────────── */
const CB_KEY = "cb:payments";
const CB_FAILURE_THRESHOLD = 5;
const CB_OPEN_TTL = 30;

async function isCircuitOpen() {
  return (await redis.get(CB_KEY)) === "open";
}

async function recordFailure() {
  const fails = await redis.incr(`${CB_KEY}:fails`);
  if (fails >= CB_FAILURE_THRESHOLD) {
    await redis.setEx(CB_KEY, CB_OPEN_TTL, "open");
    await redis.del(`${CB_KEY}:fails`);
  }
}

async function recordSuccess() {
  await redis.del(CB_KEY);
  await redis.del(`${CB_KEY}:fails`);
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
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

/* ───────────────── AUTH + QUOTA ───────────────── */
async function authMiddleware(req, res, next) {
  const apiKey = req.header("x-api-key");
  if (!apiKey) {
    return res.status(401).json({ error: "missing_api_key" });
  }

  const cacheKey = `api_key:${apiKey}`;
  let data;

  try {
    const cached = await redis.get(cacheKey);

    if (cached) {
      data = JSON.parse(cached);
      if (!data.valid) {
        return res.status(401).json({ error: "invalid_api_key" });
      }
    } else {
      const hash = crypto.createHash("sha256").update(apiKey).digest("hex");

      const { rows } = await pool.query(`
        SELECT
          mak.merchant_id,
          us.subscription_id,
          s.tokens,
          us.used_tokens
        FROM merchant_api_keys mak
        JOIN user_subscriptions us ON us.user_id = mak.merchant_id
        JOIN subscriptions s ON s.id = us.subscription_id
        WHERE mak.hash = $1
          AND mak.status = 1
          AND us.status = 1
        LIMIT 1
      `, [hash]);

      if (!rows.length) {
        await redis.setEx(cacheKey, 60, JSON.stringify({ valid: false }));
        return res.status(401).json({ error: "invalid_api_key" });
      }

      const r = rows[0];
      data = {
        valid: true,
        merchant_id: r.merchant_id,
        subscription_id: r.subscription_id,
        remaining: r.tokens - r.used_tokens,
      };

      await redis.setEx(cacheKey, 300, JSON.stringify(data));
      await redis.set(`sub:${data.subscription_id}:tokens`, data.remaining);
    }

    const tokenKey = `sub:${data.subscription_id}:tokens`;
    const left = await redis.decr(tokenKey);

    if (left < 0) {
      await redis.incr(tokenKey);
      return res.status(429).json({ error: "quota_exceeded" });
    }

    req.headers["x-merchant-id"] = data.merchant_id;
    req.body = {
      ...req.body,
      subscription_id: data.subscription_id,
      event_id: crypto.randomUUID(),
    };

    next();

  } catch (err) {
    console.error("AUTH ERROR", req.id, err);
    res.status(500).json({ error: "gateway_error" });
  }
}

/* ───────────────── PAYMENTS ROUTE ───────────────── */
app.all("/api/v1/payments", authMiddleware, async (req, res) => {
  if (await isCircuitOpen()) {
    return res.status(503).json({
      error: "payments_unavailable",
      request_id: req.id,
    });
  }

  proxy.web(req, res, { target: PAYMENTS_URL }, async (err) => {
    if (err) {
      await recordFailure();
      if (!res.headersSent) {
        res.status(502).json({ error: "payments_unreachable" });
      }
    } else {
      await recordSuccess();
    }
  });
});

/* ───────────────── WEBHOOK ───────────────── */
app.post("/api/v1/payments/webhook", (req, res) => {
  if (!verifyInternalSignature(req)) {
    return res.status(403).json({ error: "invalid_signature" });
  }

  proxy.web(req, res, { target: WEBHOOK_URL }, (err) => {
    if (err && !res.headersSent) {
      res.status(502).json({ error: "webhook_forward_failed" });
    }
  });
});

/* ───────────────── PROXY BODY FIX ───────────────── */
proxy.on("proxyReq", (proxyReq, req) => {
  if (req.body && Object.keys(req.body).length) {
    const body = JSON.stringify(req.body);
    proxyReq.setHeader("Content-Type", "application/json");
    proxyReq.setHeader("Content-Length", Buffer.byteLength(body));
    proxyReq.write(body);
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
  console.log(`Gateway running on :${PORT}`);
});
