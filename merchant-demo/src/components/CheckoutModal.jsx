import { useState } from "react"
import { createPayment } from "../api/payments"

const PROVIDER_LABELS = {
  stripe: "Stripe",
  paypal: "PayPal",
  adyen: "Adyen",
}

export default function CheckoutModal({ items, onClose, onSuccess }) {
  const [phase, setPhase] = useState("idle") // idle | loading | error
  const [error, setError] = useState(null)
  const primary = items[0].product
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )

  const handleConfirm = async () => {
    if (!window.__CONFIG__?.apiKey) {
      setError("MERCHANT_API_KEY is not set. Add it to merchant-demo/.env and restart the container.")
      setPhase("error")
      return
    }

    setPhase("loading")
    setError(null)

    try {
      const result = await createPayment({
        orderId: Date.now(),
        amount: quantity,
        price: total,
        alias: primary.provider,
      })
      onSuccess(result, items)
    } catch (e) {
      setError(e.message)
      setPhase("error")
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="modal-top">
          <span className="modal-emoji">{primary.emoji}</span>
          <h2 className="modal-title">
            {items.length === 1 ? primary.name : `${quantity} items in cart`}
          </h2>
          <p className="modal-desc">
            {items.length === 1
              ? primary.description
              : "Complete checkout for the items currently in your cart."}
          </p>
        </div>

        <div className="modal-summary">
          <div className="summary-row">
            <span>Provider</span>
            <span>{PROVIDER_LABELS[primary.provider]}</span>
          </div>
          {items.map((item) => (
            <div className="summary-row" key={item.product.id}>
              <span>{item.product.name}</span>
              <span>
                {item.quantity} × ${item.product.price.toFixed(2)}
              </span>
            </div>
          ))}
          <div className="summary-row summary-row--total">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button
            className="btn-ghost"
            onClick={onClose}
            disabled={phase === "loading"}
          >
            Cancel
          </button>
          <button
            className="btn-confirm"
            onClick={handleConfirm}
            disabled={phase === "loading"}
          >
            {phase === "loading" ? "Processing…" : "Confirm Payment"}
          </button>
        </div>
      </div>
    </div>
  )
}
