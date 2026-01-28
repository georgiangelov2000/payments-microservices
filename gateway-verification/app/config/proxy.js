import httpProxy from "http-proxy"

export const proxy = httpProxy.createProxyServer({
  proxyTimeout: 3000,
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
