import dotenv from "dotenv"
dotenv.config()

export const env = {
  PORT: process.env.PORT || 3000,
  PAYMENTS_URL: process.env.PAYMENTS_URL,
  WEBHOOK_URL: process.env.WEBHOOK_URL,
  INTERNAL_WEBHOOK_SECRET: process.env.INTERNAL_WEBHOOK_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
}
