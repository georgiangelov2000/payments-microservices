import crypto from "crypto"
import { pool } from "../config/postgres.js"
import { Errors } from "../responses/errors.js"
import { Success } from "../responses/success.js"

/**
 * Authenticate API key and return subscription context
 */
export async function apiAuth(apiKey) {
  try {
    const hash = crypto
      .createHash("sha256")
      .update(apiKey)
      .digest("hex")

    const { rows } = await pool.query(
      `
      SELECT 
          mak.merchant_id,
          us.subscription_id,
          s.tokens,
          us.used_tokens
      FROM merchant_api_keys mak
      JOIN user_subscriptions us 
          ON us.user_id = mak.merchant_id
      JOIN subscriptions s 
          ON s.id = us.subscription_id
      WHERE mak.hash = $1
        AND mak.status = 1
        AND us.status = 1
      LIMIT 1
      `,
      [hash]
    )

    // Invalid API key
    if (!rows.length) {
      return {
        ok: false,
        error: Errors.INVALID_API_KEY,
      }
    }

    const row = rows[0]

    const authData = {
      valid: true,
      merchantId: row.merchant_id,
      subscriptionId: row.subscription_id,
      tokensTotal: row.tokens,
      tokensUsed: row.used_tokens,
      tokensLeft: row.tokens - row.used_tokens,
    }

    // Success
    return {
      ok: true,
      success: Success.ACCEPTED,
      data: authData,
    }
  } catch (err) {
    console.error("API AUTH ERROR", err)

    return {
      ok: false,
      error: Errors.GATEWAY_ERROR,
    }
  }
}
