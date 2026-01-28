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

// ---------------------------------
// CREATE PAYMENT
// POST /api/v1/payments
// ---------------------------------
router.post("/", authPost, async (req, res) => {
  if (await isCircuitOpen()) {
    return send(res, Errors.PAYMENTS_UNAVAILABLE)
  }

  proxy.web(
    req,
    res,
    { target: `${env.PAYMENTS_URL}/api/v1/payments` },
    async err => {
      if (err) {
        await recordFailure()
        if (!res.headersSent) {
          return send(res, Errors.PAYMENTS_UNREACHABLE)
        }
      } else {
        await recordSuccess()
      }
    }
  )
})


// ---------------------------------
// GET PAYMENTS LIST (paginated)
// GET /api/v1/payments?page=&limit=
// ---------------------------------
router.get("/", authGet, (req, res) => {
  proxy.web(
    req,
    res,
    { target: `${env.PAYMENTS_URL}/api/v1/payments` },
    err => {
      if (err && !res.headersSent) {
        return send(res, Errors.PAYMENTS_UNREACHABLE)
      }
    }
  )
})


// ---------------------------------
// SHOW PAYMENT
// GET /api/v1/payments/:id/show
// ---------------------------------
router.get("/:id/show", authGet, (req, res) => {
  proxy.web(
    req,
    res,
    { target: `${env.PAYMENTS_URL}/api/v1/payments` },
    err => {
      if (err && !res.headersSent) {
        return send(res, Errors.PAYMENTS_UNREACHABLE)
      }
    }
  )
})


// ---------------------------------
// TRACK PAYMENT (timeline)
// GET /api/v1/payments/:id/tracking
// ---------------------------------
router.get("/:id/tracking", authGet, (req, res) => {
  proxy.web(
    req,
    res,
    { target: `${env.PAYMENTS_URL}/api/v1/payments` },
    err => {
      if (err && !res.headersSent) {
        return send(res, Errors.PAYMENTS_UNREACHABLE)
      }
    }
  )
})

export default router
