import crypto from "crypto"
import { pool } from "../config/postgres.js"
import { env } from "../config/env.js"
import { redisDel, redisGet, redisSetEx, redis, redisReady } from "../config/redis.js"

const CACHE_PREFIX = "gateway:auth:v1:"
const INVALID_PREFIX = `${CACHE_PREFIX}invalid:`
const LOCK_PREFIX = `${CACHE_PREFIX}lock:`
const LOCK_TTL_SECONDS = 5

export function hashApiKey(apiKey) {
  return crypto.createHmac("sha256", env.GATEWAY_HMAC_SECRET).update(apiKey).digest("hex")
}

/**
 * Evict a cached gateway profile by its pre-computed API key hash.
 * Called by the internal invalidation endpoint when an API key is revoked
 * or suspended so the 15-minute cache TTL is not honoured for revoked keys.
 */
export async function invalidateCacheForHash(apiKeyHash) {
  const cacheKey = `${CACHE_PREFIX}${apiKeyHash}`
  const invalidKey = `${INVALID_PREFIX}${apiKeyHash}`

  await safeRedisDel(cacheKey)
  // Write the negative-cache marker so subsequent requests skip the DB
  // lookup and fail immediately instead of re-caching the (now revoked) profile.
  await safeRedisSetEx(invalidKey, env.GATEWAY_NEGATIVE_CACHE_TTL_SECONDS, "1")
}

export async function getGatewayAccess(apiKey) {
  const apiKeyHash = hashApiKey(apiKey)
  const cacheKey = `${CACHE_PREFIX}${apiKeyHash}`
  const invalidKey = `${INVALID_PREFIX}${apiKeyHash}`
  const lockKey = `${LOCK_PREFIX}${apiKeyHash}`

  const invalidCached = await safeRedisGet(invalidKey)
  if (invalidCached) {
    return { ok: false, reason: "invalid_api_key", apiKeyHash }
  }

  const cached = await safeRedisGet(cacheKey)
  if (cached) {
    const profile = safeParse(cached)
    if (profile?.valid) {
      return { ok: true, data: profile, source: "redis", apiKeyHash }
    }
  }

  // Cache stampede guard: only one request does the DB lookup per API key.
  // Others wait briefly and then re-read from cache. If Redis is down we fall
  // through to the DB directly (safe degraded behaviour).
  const gotLock = await acquireLock(lockKey, LOCK_TTL_SECONDS)
  if (!gotLock) {
    // Another request is already loading this profile — wait then retry cache.
    await sleep(150)
    const retried = await safeRedisGet(cacheKey)
    if (retried) {
      const profile = safeParse(retried)
      if (profile?.valid) {
        return { ok: true, data: profile, source: "redis", apiKeyHash }
      }
    }
    // Still nothing (lock holder may have found an invalid key) — fall through.
  }

  try {
    const profile = await loadGatewayProfile(apiKeyHash)
    if (!profile?.valid) {
      await safeRedisSetEx(
        invalidKey,
        env.GATEWAY_NEGATIVE_CACHE_TTL_SECONDS,
        "1"
      )
      return { ok: false, reason: "invalid_api_key", apiKeyHash }
    }

    // Delete the invalid-key BEFORE writing the valid cache entry.
    // If the DEL is skipped (Redis error), the next request would still hit
    // the invalid-key check first and get a false 401. Writing valid first
    // then deleting invalid creates the same window in reverse.
    await safeRedisDel(invalidKey)
    await safeRedisSetEx(
      cacheKey,
      env.GATEWAY_AUTH_CACHE_TTL_SECONDS,
      JSON.stringify(profile)
    )

    return { ok: true, data: profile, source: "database", apiKeyHash }
  } finally {
    await safeRedisDel(lockKey)
  }
}

export function routeAllowed(profile, req) {
  const route = `${req.method.toUpperCase()} ${normalizedPath(req)}`
  if (!profile.allowedRoutes?.length) return false

  return profile.allowedRoutes.some(pattern => routeMatches(pattern, route))
}

export function providerAllowed(profile, req) {
  const alias = req.body?.alias
  if (!alias) return false
  return profile.allowedProviders?.includes(alias) ?? false
}

async function loadGatewayProfile(apiKeyHash) {
  const { rows } = await pool.query(
    `
    SELECT
      api_key_hash,
      merchant_id,
      merchant_role,
      merchant_status,
      api_key_status,
      subscription_id,
      subscription_name,
      subscription_status,
      permissions,
      allowed_routes,
      allowed_providers,
      rate_limit_per_minute,
      cache_version
    FROM gateway_access_profiles
    WHERE api_key_hash = $1
    LIMIT 1
    `,
    [apiKeyHash]
  )

  if (!rows.length) return null

  const row = rows[0]
  const valid =
    row.api_key_status === 1 &&
    row.merchant_status === 1 &&
    row.subscription_status === 1

  return {
    valid,
    merchantId: row.merchant_id,
    subscriptionId: row.subscription_id,
    planName: row.subscription_name,
    merchantRole: row.merchant_role,
    permissions: row.permissions ?? [],
    allowedRoutes: row.allowed_routes ?? [],
    allowedProviders: row.allowed_providers ?? [],
    rateLimitPerMinute: row.rate_limit_per_minute,
    cacheVersion: row.cache_version,
  }
}

function normalizedPath(req) {
  return req.originalUrl.split("?")[0].replace(/\/+$/, "") || "/"
}

function routeMatches(pattern, route) {
  const dynamicPattern = pattern.replace(/:id/g, "__ID__")
  const escaped = dynamicPattern
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/__ID__/g, "[^/]+")

  return new RegExp(`^${escaped}$`).test(route)
}

function safeParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

async function safeRedisGet(key) {
  try {
    return await redisGet(key)
  } catch {
    return null
  }
}

async function safeRedisSetEx(key, ttl, value) {
  try {
    return await redisSetEx(key, ttl, value)
  } catch {
    return false
  }
}

async function safeRedisDel(key) {
  try {
    return await redisDel(key)
  } catch {
    return false
  }
}

// Acquire a Redis NX lock. Returns true if this caller holds the lock.
// Falls back to true (allow DB access) when Redis is unavailable so auth
// still works in a degraded state.
async function acquireLock(key, ttlSeconds) {
  try {
    if (!redisReady()) return true
    const result = await redis.set(key, "1", { NX: true, EX: ttlSeconds })
    return result === "OK"
  } catch {
    return true
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
