import crypto from "crypto"
import { env } from "../config/env.js"

export function verifyInternalSignature(req) {
  const signature = req.header("x-internal-signature")
  if (!signature || !req.rawBody) return false

  const expected = crypto
    .createHmac("sha256", env.INTERNAL_WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest("hex")

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    )
  } catch {
    return false
  }
}
