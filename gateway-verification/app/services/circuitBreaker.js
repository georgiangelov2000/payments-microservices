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
    // Use a pipeline so SETEX and DEL are sent as a single atomic batch.
    // Without this, a concurrent recordSuccess() could delete CB_KEY between
    // the two commands, then DEL removes the freshly-reset counter.
    const pipeline = redis.multi()
    pipeline.setEx(CB_KEY, OPEN_TTL, "open")
    pipeline.del(`${CB_KEY}:fails`)
    await pipeline.exec()
  }
}

export async function recordSuccess() {
  // Pipeline keeps the two DELs atomic so a concurrent recordFailure()
  // cannot increment the counter between them and have it silently wiped.
  const pipeline = redis.multi()
  pipeline.del(CB_KEY)
  pipeline.del(`${CB_KEY}:fails`)
  await pipeline.exec()
}
