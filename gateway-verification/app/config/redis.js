import { createClient } from "redis"
import { env } from "./env.js"

export const redis = createClient({ url: env.REDIS_URL })

redis.on("error", err => {
  console.error("REDIS ERROR", err.message)
})

try {
  await redis.connect()
} catch (err) {
  console.error("REDIS CONNECT FAILED", err.message)
}

export function redisReady() {
  return redis.isOpen
}

export async function redisGet(key) {
  if (!redisReady()) return null
  return await redis.get(key)
}

export async function redisSetEx(key, ttlSeconds, value) {
  if (!redisReady()) return false
  await redis.setEx(key, ttlSeconds, value)
  return true
}

export async function redisDel(...keys) {
  if (!redisReady()) return false
  await redis.del(keys)
  return true
}
