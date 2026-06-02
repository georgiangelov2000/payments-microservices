import httpProxy from "http-proxy"
import http from "http"

const keepAliveAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 256,
  maxFreeSockets: 32,
  timeout: 10000,
})

export const proxy = httpProxy.createProxyServer({
  agent: keepAliveAgent,
  proxyTimeout: 5000,
  timeout: 5000,
  xfwd: true,
})

proxy.on("proxyReq", (proxyReq, req) => {
  if (req.method !== "POST") return
  if (req.body && Object.keys(req.body).length) {
    const body = JSON.stringify(req.body)
    proxyReq.setHeader("Content-Type", "application/json")
    proxyReq.setHeader("Content-Length", Buffer.byteLength(body))
    proxyReq.write(body)
  }
})
