export const STORE_NAME = "TechShop"

// alias must match a seeded provider in the payments DB: stripe | paypal
export const products = [
  {
    id: 1,
    name: "Wireless Headphones",
    price: 79.99,
    description: "Premium noise-cancelling over-ear headphones with 30h battery life",
    provider: "stripe",
    emoji: "🎧",
    category: "Audio",
    badge: "Best Seller",
  },
  {
    id: 2,
    name: "Mechanical Keyboard",
    price: 149.99,
    description: "Full-size tactile RGB backlit mechanical keyboard with aluminium frame",
    provider: "paypal",
    emoji: "⌨️",
    category: "Peripherals",
    badge: null,
  },
  {
    id: 3,
    name: "HD Webcam 1080p",
    price: 69.99,
    description: "Crystal-clear 1080p video calls with built-in noise-cancelling mic",
    provider: "stripe",
    emoji: "📷",
    category: "Video",
    badge: "Popular",
  },
  {
    id: 4,
    name: "LED Desk Lamp",
    price: 34.99,
    description: "Adjustable brightness & colour temperature with USB-A charging port",
    provider: "paypal",
    emoji: "💡",
    category: "Lighting",
    badge: null,
  },
]
