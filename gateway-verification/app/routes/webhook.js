import { Router } from "express"
import { proxy } from "../config/proxy.js"
import { env } from "../config/env.js"
import { verifyInternalSignature } from "../middlewares/verifyInternalSignature.js"

const router = Router()

router.post("/", (req, res) => {
  if (!verifyInternalSignature(req)) {
    return res.status(403).json({ error: "invalid_signature" })
  }
  proxy.web(req, res, { target: env.WEBHOOK_URL })
})

export default router
