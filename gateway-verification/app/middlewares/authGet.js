import { Errors } from "../responses/errors.js"
import { getGatewayAccess, routeAllowed } from "../services/gatewayAccess.js"

export async function authGet(req, res, next) {
  const apiKey = req.header("x-api-key")
  
  // Missing API key
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

    req.merchantId = authData.merchantId
    req.subscriptionId = authData.subscriptionId
    req.headers["x-merchant-id"] = authData.merchantId

    return next()
  } catch (e) {
    console.error("AUTH GET ERROR", e)

    return res
      .status(Errors.GATEWAY_ERROR.status)
      .json(Errors.GATEWAY_ERROR.body)
  }
}
