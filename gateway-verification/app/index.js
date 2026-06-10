import express from "express"
import helmet from "helmet"
import payments from "./routes/payments.js"
import internal from "./routes/internal.js"
import { requestId } from "./middlewares/requestId.js"
import { health } from "./health.js"
import { env } from "./config/env.js"

export const app = express()

app.use(helmet())
app.disable("x-powered-by")

app.use(
  express.json({
    limit: "256kb",
    verify: (req, _, buf) => {
      req.rawBody = buf
    },
  })
)

app.use(requestId)

app.use("/api/v1/payments", payments)
app.use("/internal", internal)
app.get("/health", health)

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Gateway listening on 0.0.0.0:${env.PORT}`)
})
