import crypto from "crypto"
import { pool } from "../config/postgres.js"
import { env } from "../config/env.js"
import { redisDel, redisGet, redisSetEx } from "../config/redis.js"

const CACHE_PREFIX = "gateway:auth:v1:"
const INVALID_PREFIX = `${CACHE_PREFIX}invalid:`

export function hashApiKey(apiKey) {
  return crypto.createHmac("sha256", env.GATEWAY_HMAC_SECRET).update(apiKey).digest("hex")
}

export async function getGatewayAccess(apiKey) {
  const apiKeyHash = hashApiKey(apiKey)
  const cacheKey = `${CACHE_PREFIX}${apiKeyHash}`
  const invalidKey = `${INVALID_PREFIX}${apiKeyHash}`

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

  const profile = await loadGatewayProfile(apiKeyHash)
  if (!profile?.valid) {
    await safeRedisSetEx(
      invalidKey,
      env.GATEWAY_NEGATIVE_CACHE_TTL_SECONDS,
      "1"
    )
    return { ok: false, reason: "invalid_api_key", apiKeyHash }
  }

  await safeRedisSetEx(
    cacheKey,
    env.GATEWAY_AUTH_CACHE_TTL_SECONDS,
    JSON.stringify(profile)
  )
  await safeRedisDel(invalidKey)

  return { ok: true, data: profile, source: "database", apiKeyHash }
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
