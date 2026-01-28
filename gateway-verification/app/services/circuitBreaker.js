import { redis } from "../config/redis.js"

const CB_KEY = "cb:payments"
const FAIL_THRESHOLD = 5
const OPEN_TTL = 30

export async function isCircuitOpen() {
  return (await redis.get(CB_KEY)) === "open"
}

export async function recordFailure() {
  const fails = await redis.incr(`${CB_KEY}:fails`)
  if (fails >= FAIL_THRESHOLD) {
    await redis.setEx(CB_KEY, OPEN_TTL, "open")
    await redis.del(`${CB_KEY}:fails`)
  }
}

export async function recordSuccess() {
  await redis.del(CB_KEY)
  await redis.del(`${CB_KEY}:fails`)
}
