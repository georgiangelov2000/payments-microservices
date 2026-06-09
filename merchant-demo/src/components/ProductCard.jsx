const PROVIDER_COLORS = {
  stripe: "#635bff",
  paypal: "#003087",
}

const PROVIDER_LABELS = {
  stripe: "Stripe",
  paypal: "PayPal",
}

export default function ProductCard({ product, onBuy, onAddToCart }) {
  return (
    <div className="product-card">
      {product.badge && (
        <span className="product-badge">{product.badge}</span>
      )}
      <div className="product-emoji">{product.emoji}</div>
      <div className="product-category">{product.category}</div>
      <h3 className="product-name">{product.name}</h3>
      <p className="product-description">{product.description}</p>
      <div className="product-footer">
        <div className="product-price-row">
          <span className="product-price">${product.price.toFixed(2)}</span>
          <span
            className="provider-tag"
            style={{ "--provider-color": PROVIDER_COLORS[product.provider] }}
          >
            {PROVIDER_LABELS[product.provider]}
          </span>
        </div>
        <div className="product-actions">
          <button className="btn-cart-add" onClick={onAddToCart}>
            Add to Cart
          </button>
          <button className="btn-buy" onClick={onBuy}>
            Pay
          </button>
        </div>
      </div>
    </div>
  )
}
