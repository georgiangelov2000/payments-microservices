import { Router } from "express"
import { proxy } from "../config/proxy.js"
import { env } from "../config/env.js"
import { verifyInternalSignature } from "../middlewares/verifyInternalSignature.js"

const router = Router()

router.post("/", (req, res) => {
  if (!verifyInternalSignature(req)) {
    return res.status(403).json({ error: "invalid_signature" })
  }
  // Express strips the mount prefix so req.url is "/".
  // Restore the full path so the webhook service receives the correct route.
  req.url = "/api/v1/payments/webhook"
  proxy.web(req, res, { target: env.WEBHOOK_URL })
})

export default router
