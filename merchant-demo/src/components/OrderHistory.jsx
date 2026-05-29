import { useEffect, useRef, useState, useCallback } from "react"
import { showPayment, acceptPayment } from "../api/payments"

const STATUS_META = {
  PAYMENT_PENDING:  { label: "Pending",   css: "pending"  },
  PAYMENT_FINISHED: { label: "Completed", css: "finished" },
  PAYMENT_FAILED:   { label: "Failed",    css: "failed"   },
}

const TERMINAL = new Set(["PAYMENT_FINISHED", "PAYMENT_FAILED"])

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function OrderRow({ order, onStatusChange }) {
  const [simulating, setSimulating] = useState(false)
  const [simError, setSimError]     = useState(null)

  const handleSimulate = async () => {
    if (!order.token) return
    setSimulating(true)
    setSimError(null)
    try {
      await acceptPayment(order.token)
    } catch (e) {
      setSimError(e.message)
      setSimulating(false)
    }
  }

  const meta    = STATUS_META[order.status] ?? { label: order.status, css: "pending" }
  const pending = order.status === "PAYMENT_PENDING"

  return (
    <li className="order-row">
      <span className="order-emoji">{order.product.emoji}</span>

      <div className="order-info">
        <span className="order-name">{order.product.name}</span>
        <span className="order-sub">
          ${order.product.price.toFixed(2)}
          {order.paymentId && <> · <code>ID {order.paymentId}</code></>}
          {order.createdAt  && <> · {fmtTime(order.createdAt)}</>}
        </span>

        {pending && order.paymentUrl && (
          <div className="order-actions">
            <a
              href={order.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="payment-link"
            >
              ↗ {order.paymentUrl}
            </a>
            <button
              className="btn-simulate"
              onClick={handleSimulate}
              disabled={simulating}
            >
              {simulating ? "Processing…" : "Simulate Payment"}
            </button>
            {simError && <span className="sim-error">{simError}</span>}
          </div>
        )}
      </div>

      <span className={`status-badge status-${meta.css}`}>
        {meta.label}
      </span>
    </li>
  )
}

export default function OrderHistory({ orders, onStatusChange }) {
  const timers = useRef({})

  const startPolling = useCallback((order) => {
    const id = order.paymentId
    if (!id || TERMINAL.has(order.status) || timers.current[id]) return

    const poll = async () => {
      try {
        const data = await showPayment(id)
        onStatusChange(id, data.status)
        if (!TERMINAL.has(data.status)) {
          timers.current[id] = setTimeout(poll, 2000)
        } else {
          delete timers.current[id]
        }
      } catch {
        timers.current[id] = setTimeout(poll, 5000)
      }
    }

    timers.current[id] = setTimeout(poll, 1500)
  }, [onStatusChange])

  useEffect(() => {
    orders.forEach(startPolling)
  }, [orders, startPolling])

  useEffect(() => {
    const t = timers.current
    return () => Object.values(t).forEach(clearTimeout)
  }, [])

  return (
    <section className="order-history">
      <h2 className="section-heading">Order History</h2>
      <ul className="orders-list">
        {orders.map((order) => (
          <OrderRow
            key={order.paymentId}
            order={order}
            onStatusChange={onStatusChange}
          />
        ))}
      </ul>
    </section>
  )
}
