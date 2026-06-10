import dotenv from "dotenv"
dotenv.config()

if (!process.env.GATEWAY_HMAC_SECRET) {
  throw new Error("GATEWAY_HMAC_SECRET is required")
}

export const env = {
  PORT: process.env.PORT || 3000,
  PAYMENTS_URL: process.env.PAYMENTS_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  GATEWAY_AUTH_CACHE_TTL_SECONDS: Number(process.env.GATEWAY_AUTH_CACHE_TTL_SECONDS || 900),
  GATEWAY_NEGATIVE_CACHE_TTL_SECONDS: Number(process.env.GATEWAY_NEGATIVE_CACHE_TTL_SECONDS || 60),
  GATEWAY_HMAC_SECRET: process.env.GATEWAY_HMAC_SECRET,
  GATEWAY_INTERNAL_SECRET: process.env.GATEWAY_INTERNAL_SECRET || "",
}
