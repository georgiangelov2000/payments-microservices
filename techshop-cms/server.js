import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = {
  port: Number(process.env.CMS_PORT || 3002),
  publicUrl: process.env.CMS_PUBLIC_URL || 'http://localhost:3002',
  dataDir: process.env.CMS_DATA_DIR || path.join(__dirname, 'data'),
  adminToken: process.env.CMS_ADMIN_TOKEN || '',
  webhookSecret: process.env.CMS_WEBHOOK_SECRET || '',
  webhookMaxSkewSeconds: Number(process.env.WEBHOOK_MAX_SKEW_SECONDS || 300),
  webhookForwardUrl: process.env.WEBHOOK_FORWARD_URL || '',
  webhookForwardToken: process.env.WEBHOOK_FORWARD_TOKEN || '',
  merchantDemoUrl: process.env.MERCHANT_DEMO_URL || 'http://localhost:3001',
  paymentGatewayUrl: process.env.PAYMENT_GATEWAY_URL || 'http://gateway',
};

const files = {
  content: path.join(config.dataDir, 'content.json'),
  payments: path.join(config.dataDir, 'payments.json'),
  paymentEvents: path.join(config.dataDir, 'payment-events.jsonl'),
};

function log(level, message, meta = {}) {
  const entry = {
    time: new Date().toISOString(),
    level,
    service: 'techshop-cms',
    message,
    ...meta,
  };
  console.log(JSON.stringify(entry));
}

async function ensureDataFiles() {
  await fs.mkdir(config.dataDir, { recursive: true });

  try {
    await fs.access(files.content);
  } catch {
    await writeJson(files.content, {
      heroTitle: 'TechShop',
      heroSubtitle: 'Demo storefront content managed by the TechShop CMS.',
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    await fs.access(files.payments);
  } catch {
    await writeJson(files.payments, []);
  }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(file, value) {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function readBody(req, maxBytes = 1024 * 1024) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error('Payload is too large');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, payload, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'content-type': contentType,
    'cache-control': 'no-store',
  });
  res.end(payload);
}

function unauthorized(res) {
  sendJson(res, 401, { error: 'unauthorized' });
}

function requireAdmin(req, res) {
  if (!config.adminToken) return true;
  const token = req.headers['x-cms-admin-token'] || '';
  if (token === config.adminToken) return true;
  unauthorized(res);
  return false;
}

function timingSafeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function verifyWebhookSignature(req, rawBody) {
  if (!config.webhookSecret) {
    return { ok: true, mode: 'unsigned-local' };
  }

  const techshopSignature = String(req.headers['x-techshop-signature'] || '');
  const techshopTimestamp = String(req.headers['x-techshop-timestamp'] || '');
  const payflowSignature = String(req.headers['x-payflow-signature'] || '');

  if (techshopSignature && techshopTimestamp) {
    return verifyTimestampedHmac(techshopTimestamp, techshopSignature, rawBody, 'hmac-sha256');
  }

  if (payflowSignature) {
    const parts = Object.fromEntries(
      payflowSignature.split(',').map((part) => {
        const [key, value] = part.split('=');
        return [String(key || '').trim(), String(value || '').trim()];
      }),
    );

    if (parts.t && parts.v1) {
      return verifyTimestampedHmac(parts.t, `sha256=${parts.v1}`, rawBody, 'payflow-hmac-sha256');
    }
  }

  return { ok: false, reason: 'Missing webhook signature headers' };
}

function verifyTimestampedHmac(timestamp, signature, rawBody, mode) {
  if (!signature || !timestamp) {
    return { ok: false, reason: 'Missing webhook signature headers' };
  }

  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs)) {
    return { ok: false, reason: 'Invalid webhook timestamp' };
  }

  const skewSeconds = Math.abs(Date.now() - timestampMs) / 1000;
  if (skewSeconds > config.webhookMaxSkewSeconds) {
    return { ok: false, reason: 'Webhook timestamp is outside the allowed window' };
  }

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = `sha256=${crypto
    .createHmac('sha256', config.webhookSecret)
    .update(signedPayload)
    .digest('hex')}`;

  if (!timingSafeEqual(signature, expected)) {
    return { ok: false, reason: 'Invalid webhook signature' };
  }

  return { ok: true, mode };
}

function normalizePaymentPayload(payload) {
  const payment = payload.payment && typeof payload.payment === 'object'
    ? payload.payment
    : payload.data && typeof payload.data === 'object'
      ? payload.data
      : payload;

  const status = String(payment.status || payload.status || '').toLowerCase();
  const completedStatuses = new Set(['completed', 'paid', 'succeeded', 'success', 'finished']);

  const normalized = {
    event_id: payload.event_id || payload.id || crypto.randomUUID(),
    event_type: payload.event_type || payload.type || payload.event || 'payment.completed',
    payment_id: payment.payment_id || payment.id || payment.provider_reference || null,
    order_id: payment.order_id || payload.order_id || null,
    merchant_id: payment.merchant_id || payload.merchant_id || 'techshop',
    merchant_name: payment.merchant_name || payload.merchant_name || 'TechShop',
    amount: Number(payment.amount ?? payment.price ?? payload.amount ?? payload.price),
    currency: String(payment.currency || payload.currency || 'USD').toUpperCase(),
    status,
    provider: payment.provider || payload.provider || null,
    completed_at: payment.completed_at || payload.completed_at || new Date().toISOString(),
    raw: payload,
  };

  const errors = [];
  if (!normalized.order_id) errors.push('order_id is required');
  if (!normalized.payment_id) errors.push('payment_id is required');
  if (!Number.isFinite(normalized.amount) || normalized.amount < 0) errors.push('amount must be a non-negative number');
  if (!normalized.currency.match(/^[A-Z]{3}$/)) errors.push('currency must be a three-letter ISO code');
  if (!completedStatuses.has(normalized.status)) errors.push('status must indicate a completed payment');

  return { payment: normalized, errors };
}

async function storePayment(payment) {
  const payments = await readJson(files.payments, []);
  const existingIndex = payments.findIndex((item) => item.payment_id === payment.payment_id);
  const stored = {
    ...payment,
    received_at: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    payments[existingIndex] = {
      ...payments[existingIndex],
      ...stored,
      updated_at: new Date().toISOString(),
    };
  } else {
    payments.unshift(stored);
  }

  await writeJson(files.payments, payments.slice(0, 500));
  await fs.appendFile(files.paymentEvents, `${JSON.stringify(stored)}\n`);

  return stored;
}

async function deleteFirstPayment() {
  const payments = await readJson(files.payments, []);
  const removed = payments.shift() || null;
  await writeJson(files.payments, payments);

  return removed;
}

async function forwardPayment(payment) {
  if (!config.webhookForwardUrl) return null;

  const headers = {
    'content-type': 'application/json',
    'user-agent': 'techshop-cms-webhook/0.1',
  };

  if (config.webhookForwardToken) {
    headers.authorization = `Bearer ${config.webhookForwardToken}`;
  }

  const response = await fetch(config.webhookForwardUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ event_type: 'payment.completed', payment }),
  });

  if (!response.ok) {
    throw new Error(`Forward failed with HTTP ${response.status}`);
  }

  return { status: response.status };
}

async function handleWebhook(req, res) {
  const rawBody = await readBody(req);
  const signature = verifyWebhookSignature(req, rawBody);

  if (!signature.ok) {
    log('warn', 'Rejected payment webhook', { reason: signature.reason });
    return sendJson(res, 401, { error: 'invalid_signature', message: signature.reason });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return sendJson(res, 400, { error: 'invalid_json' });
  }

  if (payload.test === true) {
    log('info', 'Received test webhook ping', { event_type: payload.event_type || payload.event });
    return sendJson(res, 200, { ok: true, test: true });
  }

  const { payment, errors } = normalizePaymentPayload(payload);
  if (errors.length > 0) {
    log('warn', 'Rejected invalid payment webhook payload', { errors });
    return sendJson(res, 422, { error: 'invalid_payload', details: errors });
  }

  const stored = await storePayment(payment);
  let forward = null;

  try {
    forward = await forwardPayment(stored);
  } catch (error) {
    log('error', 'Stored webhook but forwarding failed', {
      payment_id: stored.payment_id,
      error: error.message,
    });
    return sendJson(res, 202, {
      ok: true,
      stored: true,
      forwarded: false,
      warning: 'Payment stored, but forwarding failed',
      payment_id: stored.payment_id,
    });
  }

  log('info', 'Processed completed payment webhook', {
    payment_id: stored.payment_id,
    order_id: stored.order_id,
    amount: stored.amount,
    currency: stored.currency,
    signature: signature.mode,
    forwarded: Boolean(forward),
  });

  return sendJson(res, 202, {
    ok: true,
    stored: true,
    forwarded: Boolean(forward),
    payment_id: stored.payment_id,
  });
}

async function serveStatic(req, res, pathname) {
  const filePath = pathname === '/'
    ? path.join(__dirname, 'public', 'index.html')
    : path.join(__dirname, 'public', pathname.replace(/^\/+/, ''));

  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    return sendJson(res, 403, { error: 'forbidden' });
  }

  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const contentType = ext === '.html'
      ? 'text/html; charset=utf-8'
      : ext === '.css'
        ? 'text/css; charset=utf-8'
        : 'application/octet-stream';

    sendText(res, 200, content, contentType);
  } catch {
    sendJson(res, 404, { error: 'not_found' });
  }
}

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, config.publicUrl);
    const pathname = url.pathname;

    if (req.method === 'GET' && pathname === '/health') {
      return sendJson(res, 200, {
        ok: true,
        service: 'techshop-cms',
        merchant_demo_url: config.merchantDemoUrl,
        payment_gateway_url: config.paymentGatewayUrl,
      });
    }

    if (req.method === 'GET' && pathname === '/api/content') {
      return sendJson(res, 200, await readJson(files.content, {}));
    }

    if (req.method === 'PUT' && pathname === '/api/content') {
      if (!requireAdmin(req, res)) return;
      const rawBody = await readBody(req);
      const content = JSON.parse(rawBody.toString('utf8'));
      await writeJson(files.content, { ...content, updatedAt: new Date().toISOString() });
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && pathname === '/api/payments') {
      return sendJson(res, 200, {
        data: await readJson(files.payments, []),
      });
    }

    if (req.method === 'DELETE' && pathname === '/api/payments/first') {
      if (!requireAdmin(req, res)) return;
      const removed = await deleteFirstPayment();
      log('info', 'Deleted first CMS payment record', {
        payment_id: removed?.payment_id || null,
      });
      return sendJson(res, 200, {
        ok: true,
        removed,
      });
    }

    if (req.method === 'POST' && pathname === '/webhooks/payments/completed') {
      return handleWebhook(req, res);
    }

    if (req.method === 'GET') {
      return serveStatic(req, res, pathname);
    }

    sendJson(res, 405, { error: 'method_not_allowed' }, { allow: 'GET, PUT, POST' });
  } catch (error) {
    log('error', 'Unhandled request error', { error: error.message, path: req.url });
    sendJson(res, error.statusCode || 500, { error: 'internal_error', message: error.message });
  }
}

await ensureDataFiles();

http.createServer(handleRequest).listen(config.port, '0.0.0.0', () => {
  log('info', 'TechShop CMS listening', {
    port: config.port,
    public_url: config.publicUrl,
    webhook_url: `${config.publicUrl}/webhooks/payments/completed`,
    signatures_required: Boolean(config.webhookSecret),
    forwarding_enabled: Boolean(config.webhookForwardUrl),
  });
});
