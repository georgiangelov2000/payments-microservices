import crypto from "crypto"
import { redis } from "../config/redis.js"
import { pool } from "../config/postgres.js"

export async function authPost(req, res, next) {
  if (req.method !== "POST") return next()

  const apiKey = req.header("x-api-key")
  if (!apiKey) {
    return send(res, Errors.UNAUTHORIZED)
  }

  try {
    const cacheKey = `api_key:${apiKey}`
    let data = await redis.get(cacheKey)
    data = data ? JSON.parse(data) : null

    if (!data) {
      const hash = crypto.createHash("sha256").update(apiKey).digest("hex")
      const { rows } = await pool.query(`
        SELECT mak.merchant_id, us.subscription_id, s.tokens, us.used_tokens
        FROM merchant_api_keys mak
        JOIN user_subscriptions us ON us.user_id = mak.merchant_id
        JOIN subscriptions s ON s.id = us.subscription_id
        WHERE mak.hash = $1 AND mak.status = 1 AND us.status = 1
        LIMIT 1
      `, [hash])

      if (!rows.length) {
        await redis.setEx(cacheKey, 60, JSON.stringify({ valid: false }))
        return send(res, Errors.UNAUTHORIZED)
      }

      const r = rows[0]
      data = {
        valid: true,
        merchant_id: r.merchant_id,
        subscription_id: r.subscription_id,
        remaining: r.tokens - r.used_tokens,
      }

      await redis.setEx(cacheKey, 300, JSON.stringify(data))
      await redis.set(`sub:${data.subscription_id}:tokens`, data.remaining)
    }

    const tokenKey = `sub:${data.subscription_id}:tokens`
    if (await redis.decr(tokenKey) < 0) {
      await redis.incr(tokenKey)
      return send(res, Errors.QUOTA_EXCEEDED)
    }

    req.headers["x-merchant-id"] = data.merchant_id
    req.body = {
      ...req.body,
      subscription_id: data.subscription_id,
      event_id: crypto.randomUUID(),
    }

    next()
  } catch (e) {
    console.error("AUTH POST ERROR", req.id, e)
    return send(res, Errors.GATEWAY_ERROR)
  }
}
