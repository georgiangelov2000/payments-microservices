import dotenv from "dotenv"
dotenv.config()

export const env = {
  PORT: process.env.PORT || 3000,
  PAYMENTS_URL: process.env.PAYMENTS_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  GATEWAY_AUTH_CACHE_TTL_SECONDS: Number(process.env.GATEWAY_AUTH_CACHE_TTL_SECONDS || 900),
  GATEWAY_NEGATIVE_CACHE_TTL_SECONDS: Number(process.env.GATEWAY_NEGATIVE_CACHE_TTL_SECONDS || 60),
}
