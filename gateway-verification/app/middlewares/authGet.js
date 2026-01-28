import { Errors } from "../responses/errors.js"
import { send } from "../responses/send.js"

export function authGet(req, res, next) {
  if (!req.header("x-api-key")) {
    return send(res, Errors.UNAUTHORIZED)
  }
  next()
}
