import { redisDel, redisGet, redisReady, redisSetEx, redis } from "../config/redis.js"

const CB_KEY = "cb:payments"
const FAIL_THRESHOLD = 5
const OPEN_TTL = 30

export async function isCircuitOpen() {
  if (!redisReady()) return false
  return (await redisGet(CB_KEY)) === "open"
}

export async function recordFailure() {
  if (!redisReady()) return
  const fails = await redis.incr(`${CB_KEY}:fails`)
  if (fails >= FAIL_THRESHOLD) {
    await redisSetEx(CB_KEY, OPEN_TTL, "open")
    await redisDel(`${CB_KEY}:fails`)
  }
}

export async function recordSuccess() {
  await redisDel(CB_KEY)
  await redisDel(`${CB_KEY}:fails`)
}
