import express from "express"
import { env } from "../config/env.js"
import { invalidateCacheForHash } from "../services/gatewayAccess.js"

const router = express.Router()

/**
 * Middleware: verify the shared internal secret sent by Laravel services.
 * This endpoint is not exposed through the public nginx gateway — it is
 * reachable only on the Docker-internal network from saas-laravel/admin-laravel.
 */
function requireInternalSecret(req, res, next) {
  if (!env.GATEWAY_INTERNAL_SECRET) {
    // Secret not configured — reject rather than allow open access.
    return res.status(503).json({ error: "Internal auth not configured" })
  }

  const auth = req.headers["authorization"] ?? ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : ""

  if (!token || token !== env.GATEWAY_INTERNAL_SECRET) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  next()
}

/**
 * POST /internal/cache/invalidate
 * Body: { "api_key_hash": "<hex string>" }
 *
 * Evicts the Redis auth cache entry for the given hash so that a revoked
 * or suspended API key is rejected on the very next request instead of
 * being served from the 15-minute TTL cache.
 */
router.post("/cache/invalidate", requireInternalSecret, async (req, res) => {
  const { api_key_hash: apiKeyHash } = req.body ?? {}

  if (!apiKeyHash || typeof apiKeyHash !== "string" || !/^[0-9a-f]{64}$/i.test(apiKeyHash)) {
    return res.status(400).json({ error: "api_key_hash must be a 64-character hex string" })
  }

  await invalidateCacheForHash(apiKeyHash)

  return res.json({ invalidated: true, hash: apiKeyHash })
})

export default router
