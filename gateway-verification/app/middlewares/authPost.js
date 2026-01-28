import crypto from "crypto"
import { redis } from "../config/redis.js"
import { apiAuth } from "../config/auth.js"
import { Errors } from "../responses/errors.js"

export async function authPost(req, res, next) {
  if (req.method !== "POST") return next()

  const apiKey = req.header("x-api-key")
  if (!apiKey) {
    return res
      .status(Errors.UNAUTHORIZED.status)
      .json({ message: Errors.UNAUTHORIZED.message })
  }

  try {
    const cacheKey = `api_key:${apiKey}`
    let authData = await redis.get(cacheKey)
    authData = authData ? JSON.parse(authData) : null
    
    // ----------------------------------------
    // Cache miss → validate API key
    // ----------------------------------------
    if (!authData) {
      const result = await apiAuth(apiKey)

      if (!result.ok) {
        await redis.setEx(cacheKey, 60, JSON.stringify({ valid: false }))
        return res
          .status(result.status)
          .json({ message: result.message })
      }

      authData = result.data

      await redis.setEx(cacheKey, 300, JSON.stringify(authData))
      await redis.set(
        `sub:${authData.subscriptionId}:tokens`,
        authData.tokensLeft
      )
    }

    // ----------------------------------------
    // Token decrement (atomic)
    // ----------------------------------------
    const tokenKey = `sub:${authData.subscriptionId}:tokens`
    const remaining = await redis.decr(tokenKey)

    if (remaining < 0) {
      await redis.incr(tokenKey)
      return res
        .status(Errors.QUOTA_EXCEEDED.status)
        .json({ message: Errors.QUOTA_EXCEEDED.message })
    }

    // ----------------------------------------
    // Inject context
    // ----------------------------------------
    req.headers["x-merchant-id"] = authData.merchantId
    req.body = {
      ...req.body,
      subscription_id: authData.subscriptionId,
      event_id: crypto.randomUUID(),
    }
    
    next()
  } catch (e) {
    console.error("AUTH POST ERROR", e)
    return res
      .status(Errors.GATEWAY_ERROR.status)
      .json({ message: Errors.GATEWAY_ERROR.message })
  }
}
