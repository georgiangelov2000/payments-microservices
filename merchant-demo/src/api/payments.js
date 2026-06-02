function apiKey() {
  return window.__CONFIG__?.apiKey ?? ""
}

async function parseResponse(res) {
  const contentType = res.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    return res.json()
  }

  const text = await res.text()
  return { message: text || `HTTP ${res.status}` }
}

export async function createPayment({ orderId, amount, price, alias }) {
  const res = await fetch("/api/v1/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey(),
    },
    body: JSON.stringify({ order_id: orderId, amount, price, alias }),
  })
  const data = await parseResponse(res)
  if (!res.ok) throw new Error(data.detail || data.message || `HTTP ${res.status}`)
  return data
}

export async function showPayment(paymentId) {
  const res = await fetch(`/api/v1/payments/${paymentId}/show`, {
    headers: { "x-api-key": apiKey() },
  })
  const data = await parseResponse(res)
  if (!res.ok) throw new Error(data.detail || data.message || `HTTP ${res.status}`)
  return data
}
