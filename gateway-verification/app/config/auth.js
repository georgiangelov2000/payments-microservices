import { getGatewayAccess } from "../services/gatewayAccess.js"
import { Errors } from "../responses/errors.js"
import { Success } from "../responses/success.js"

/**
 * Backward-compatible auth facade.
 * The gateway now reads Redis first, then falls back to the denormalized
 * gateway_access_profiles table with one indexed lookup.
 */
export async function apiAuth(apiKey) {
  try {
    const result = await getGatewayAccess(apiKey)

    if (!result.ok) {
      return {
        ok: false,
        error: Errors.INVALID_API_KEY,
      }
    }

    return {
      ok: true,
      success: Success.ACCEPTED,
      data: result.data,
      source: result.source,
    }
  } catch (err) {
    console.error("API AUTH ERROR", err)

    return {
      ok: false,
      error: Errors.GATEWAY_ERROR,
    }
  }
}
