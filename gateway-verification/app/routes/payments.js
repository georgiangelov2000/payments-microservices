import { Router } from "express"
import { proxy } from "../config/proxy.js"
import { env } from "../config/env.js"
import { authPost } from "../middlewares/authPost.js"
import { authGet } from "../middlewares/authGet.js"
import {
  isCircuitOpen,
  recordFailure,
  recordSuccess,
} from "../services/circuitBreaker.js"

import { Errors } from "../responses/errors.js"
import { send } from "../responses/send.js"

const router = Router()

router.post("/", authPost, async (req, res) => {
  if (await isCircuitOpen()) {
    return send(res, Errors.PAYMENTS_UNAVAILABLE)
  }
  proxy.web(req, res, { target: `${env.PAYMENTS_URL}/api/v1/payments` }, async err => {
    if (err) {
      await recordFailure()
      if (!res.headersSent) {
        return send(res, Errors.PAYMENTS_UNREACHABLE)
      }
    } else {
      await recordSuccess()
    }
  })
})

router.get("/:id/tracking", authGet, (req, res) => {
  proxy.web(
    req,
    res,
    { target: `${env.PAYMENTS_URL}/api/v1/payments` },
    err => {
      if (err && !res.headersSent) {
        return res
          .status(Errors.PAYMENTS_UNREACHABLE.code)
          .json({ message: Errors.PAYMENTS_UNREACHABLE.message })
      }
    }
  )
})


export default router
