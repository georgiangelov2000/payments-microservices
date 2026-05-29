import { useState, useCallback, useEffect } from "react"
import { products, STORE_NAME } from "./data/products"
import ProductCard from "./components/ProductCard"
import CheckoutModal from "./components/CheckoutModal"
import OrderHistory from "./components/OrderHistory"

const CART_STORAGE_KEY = "techshop.cart"
const ORDERS_STORAGE_KEY = "techshop.orders"

function readStoredValue(key, fallback) {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export default function App() {
  const [page, setPage] = useState("products")
  const [checkout, setCheckout] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState(() => readStoredValue(CART_STORAGE_KEY, []))
  const [orders, setOrders] = useState(() => readStoredValue(ORDERS_STORAGE_KEY, []))

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders))
  }, [orders])

  const addToCart = useCallback((product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...prev, { product, quantity: 1 }]
    })
    setCartOpen(true)
  }, [])

  const updateQuantity = useCallback((productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }, [])

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }, [])

  const checkoutCart = useCallback(() => {
    if (!cart.length) return
    setCheckout({ items: cart })
    setCartOpen(false)
  }, [cart])

  const handleSuccess = useCallback((result, checkoutItems) => {
    const quantity = checkoutItems.reduce((sum, item) => sum + item.quantity, 0)
    const total = checkoutItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    )

    setOrders((prev) => [
      {
        paymentId: result.payment_id,
        status: result.status ?? "PAYMENT_PENDING",
        product: {
          ...checkoutItems[0].product,
          name:
            checkoutItems.length === 1
              ? checkoutItems[0].product.name
              : `${quantity} items`,
          price: total,
        },
        items: checkoutItems,
        paymentUrl: result.payment_url ?? null,
        token: result.payment_url?.split("/").pop() ?? null,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])
    setCart([])
    setCheckout(null)
    setPage("orders")
  }, [])

  const handleStatusChange = useCallback((paymentId, status) => {
    setOrders((prev) =>
      prev.map((o) => (o.paymentId === paymentId ? { ...o, status } : o))
    )
  }, [])

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-bolt">⚡</span>
            <span className="brand-name">{STORE_NAME}</span>
            <span className="brand-tag">Demo Store</span>
          </div>
          <nav className="main-nav" aria-label="Store navigation">
            <button
              className={page === "products" ? "nav-active" : ""}
              onClick={() => setPage("products")}
            >
              Products
            </button>
            <button
              className={page === "orders" ? "nav-active" : ""}
              onClick={() => setPage("orders")}
            >
              Orders
            </button>
          </nav>
          <div className="header-actions">
            {orders.length > 0 && (
              <button className="header-count" onClick={() => setPage("orders")}>
                {orders.length} order{orders.length !== 1 ? "s" : ""}
              </button>
            )}
            <button className="cart-button" onClick={() => setCartOpen(true)}>
              <span>Cart</span>
              <strong>{cartCount}</strong>
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          {page === "products" ? (
            <>
              <div className="page-intro">
                <h1>Featured Products</h1>
                <p>Each purchase creates a real payment through the Application Gateway</p>
              </div>

              <div className="product-grid">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onBuy={() => setCheckout({ items: [{ product: p, quantity: 1 }] })}
                    onAddToCart={() => addToCart(p)}
                  />
                ))}
              </div>
            </>
          ) : (
            <section className="orders-page">
              <div className="page-intro page-intro--split">
                <div>
                  <h1>Orders</h1>
                  <p>Track payment links, provider acceptance, and completed purchases.</p>
                </div>
                <button className="btn-shop" onClick={() => setPage("products")}>
                  Continue Shopping
                </button>
              </div>

              {orders.length > 0 ? (
                <OrderHistory orders={orders} onStatusChange={handleStatusChange} />
              ) : (
                <div className="orders-empty">
                  <span>🧾</span>
                  <h2>No orders yet</h2>
                  <p>Your completed checkouts will appear here.</p>
                  <button className="btn-confirm" onClick={() => setPage("products")}>
                    Browse Products
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {cartOpen && (
        <div className="cart-drawer" onClick={() => setCartOpen(false)}>
          <aside className="cart-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cart-head">
              <div>
                <h2>Your Cart</h2>
                <p>{cartCount} item{cartCount !== 1 ? "s" : ""}</p>
              </div>
              <button className="modal-x" onClick={() => setCartOpen(false)} aria-label="Close">
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="cart-empty">
                <span>🛒</span>
                <p>Your cart is empty</p>
              </div>
            ) : (
              <>
                <ul className="cart-list">
                  {cart.map((item) => (
                    <li className="cart-item" key={item.product.id}>
                      <span className="cart-emoji">{item.product.emoji}</span>
                      <div className="cart-meta">
                        <strong>{item.product.name}</strong>
                        <small>${item.product.price.toFixed(2)}</small>
                      </div>
                      <div className="cart-qty">
                        <button onClick={() => updateQuantity(item.product.id, -1)}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)}>+</button>
                      </div>
                      <button
                        className="cart-remove"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="cart-total">
                  <span>Total</span>
                  <strong>${cartTotal.toFixed(2)}</strong>
                </div>

                <div className="cart-actions">
                  <button className="btn-ghost" onClick={() => setCart([])}>
                    Clear
                  </button>
                  <button className="btn-confirm" onClick={checkoutCart}>
                    Checkout
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {checkout && (
        <CheckoutModal
          items={checkout.items}
          onClose={() => setCheckout(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
