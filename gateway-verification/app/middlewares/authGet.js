import { Errors } from "../responses/errors.js"
import { apiAuth } from "../config/auth.js"
import { redis } from "../config/redis.js"

export async function authGet(req, res, next) {
  const apiKey = req.header("x-api-key")
  
  // Missing API key
  if (!apiKey) {
    return res
      .status(Errors.UNAUTHORIZED.status)
      .json(Errors.UNAUTHORIZED.body)
  }

  try {
    const cacheKey = `api_key:${apiKey}`

    // ---- Redis cache ----
    const cached = await redis.get(cacheKey)
    if (cached) {
      const data = JSON.parse(cached)

      if (!data.valid) {
        return res
          .status(Errors.INVALID_API_KEY.status)
          .json(Errors.INVALID_API_KEY.body)
      }

      // attach context
      req.merchantId = data.merchantId
      req.subscriptionId = data.subscriptionId
      req.headers["x-merchant-id"] = data.merchantId

      return next()
    }

    // ---- DB auth ----
    const result = await apiAuth(apiKey)

    if (!result.ok) {
      return res
        .status(result.error.status)
        .json(result.error.body)
    }

    // ---- Cache success ----
    await redis.setEx(
      cacheKey,
      300,
      JSON.stringify({
        valid: true,
        merchantId: result.data.merchantId,
        subscriptionId: result.data.subscriptionId,
      })
    )

    req.merchantId = result.data.merchantId
    req.subscriptionId = result.data.subscriptionId
    req.headers["x-merchant-id"] = result.data.merchantId

    return next()
  } catch (e) {
    console.error("AUTH GET ERROR", e)

    return res
      .status(Errors.GATEWAY_ERROR.status)
      .json(Errors.GATEWAY_ERROR.body)
  }
}
