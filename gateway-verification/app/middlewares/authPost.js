import crypto from "crypto"
import { Errors } from "../responses/errors.js"
import { getGatewayAccess, providerAllowed, routeAllowed } from "../services/gatewayAccess.js"

export async function authPost(req, res, next) {
  if (req.method !== "POST") return next()

  const apiKey = req.header("x-api-key")
  if (!apiKey) {
    return res
      .status(Errors.UNAUTHORIZED.status)
      .json(Errors.UNAUTHORIZED.body)
  }

  try {
    const result = await getGatewayAccess(apiKey)

    if (!result.ok) {
      return res
        .status(Errors.INVALID_API_KEY.status)
        .json(Errors.INVALID_API_KEY.body)
    }

    const authData = result.data

    if (!routeAllowed(authData, req)) {
      return res
        .status(Errors.FORBIDDEN_ROUTE.status)
        .json(Errors.FORBIDDEN_ROUTE.body)
    }

    // Only enforce provider allowlist when the merchant explicitly pins a provider.
    // alias: null means "let the routing engine decide" and must pass through.
    const alias = req.body?.alias
    if (alias && !providerAllowed(authData, req)) {
      return res
        .status(Errors.PROVIDER_NOT_ALLOWED.status)
        .json(Errors.PROVIDER_NOT_ALLOWED.body)
    }

    // ----------------------------------------
    // Inject context
    // ----------------------------------------
    req.headers["x-merchant-id"] = authData.merchantId
    req.body = {
      ...req.body,
      subscription_id: authData.subscriptionId,
      event_id: crypto.randomUUID(),
    }
    
    next()
  } catch (e) {
    console.error("AUTH POST ERROR", e)
    return res
      .status(Errors.GATEWAY_ERROR.status)
      .json(Errors.GATEWAY_ERROR.body)
  }
}
