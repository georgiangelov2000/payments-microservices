import { redis } from "./config/redis.js"
import { pool } from "./config/postgres.js"

export async function health(_, res) {
  try {
    await redis.ping()
    await pool.query("SELECT 1")
    res.sendStatus(200)
  } catch {
    res.sendStatus(503)
  }
}
