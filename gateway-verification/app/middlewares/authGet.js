import { Errors } from "../responses/errors.js"
import { apiAuth } from "../config/auth.js"
import { redis } from "../config/redis.js"

export async function authGet(req, res, next) {
  const apiKey = req.header("x-api-key")

  if (!apiKey) {
    return res
      .status(Errors.UNAUTHORIZED.code)
      .json({ message: Errors.UNAUTHORIZED.message })
  }

  try {
    const cacheKey = `api_key:${apiKey}`

    const cached = await redis.get(cacheKey)
    if (cached) {
      const data = JSON.parse(cached)

      if (!data.valid) {
        return res
          .status(Errors.INVALID_API_KEY.code)
          .json({ message: Errors.INVALID_API_KEY.message })
      }

      return next()
    }

    const result = await apiAuth(apiKey)

    if (!result.ok) {
      return res
        .status(result.code)
        .json({ message: result.message })
    }

    await redis.setEx(
      cacheKey,
      300,
      JSON.stringify({
        valid: true,
        merchantId: result.data.merchantId,
        subscriptionId: result.data.subscriptionId,
      })
    )

    next()
  } catch (e) {
    console.error("AUTH GET ERROR", e)

    return res
      .status(Errors.GATEWAY_ERROR.code)
      .json({ message: Errors.GATEWAY_ERROR.message })
  }
}
