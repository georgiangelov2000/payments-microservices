export const Errors = {
  PAYMENTS_UNAVAILABLE: {
    status: 503,
    body: { error: "payments_unavailable" },
  },

  PAYMENTS_UNREACHABLE: {
    status: 502,
    body: { error: "payments_unreachable" },
  },

  GATEWAY_ERROR: {
    status: 500,
    body: { error: "gateway_error" },
  },

  UNAUTHORIZED: {
    status: 401,
    body: { error: "unauthorized" },
  },

  QUOTA_EXCEEDED: {
    status: 429,
    body: { error: "quota_exceeded" },
  },
}
