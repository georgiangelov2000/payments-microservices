PROVIDER_META = {
    "stripe": {"label": "Stripe", "color": "#635bff", "logo": "S"},
    "paypal": {"label": "PayPal", "color": "#003087", "logo": "P"},
    "adyen":  {"label": "Adyen",  "color": "#0abf53", "logo": "A"},
}


def render(token: str, provider: str, payment_id: int) -> str:
    meta = PROVIDER_META.get(provider, {"label": provider.title(), "color": "#6366f1", "logo": "?"})

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Complete Payment · {meta["label"]}</title>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

    body {{
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      padding: 24px;
    }}

    .card {{
      background: #fff;
      border-radius: 20px;
      padding: 40px 36px 36px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 32px 80px rgba(0,0,0,.45);
    }}

    /* ── Header ── */
    .header {{ text-align: center; margin-bottom: 32px; }}

    .provider-badge {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: {meta["color"]}18;
      border: 1px solid {meta["color"]}40;
      color: {meta["color"]};
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .08em;
      padding: 5px 14px;
      border-radius: 99px;
      margin-bottom: 20px;
    }}

    .provider-dot {{
      width: 18px; height: 18px;
      border-radius: 50%;
      background: {meta["color"]};
      color: #fff;
      font-size: 0.65rem;
      font-weight: 900;
      display: flex; align-items: center; justify-content: center;
    }}

    .lock-icon {{ font-size: 2rem; margin-bottom: 10px; display: block; }}

    h1 {{
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -.02em;
    }}

    .subtitle {{
      font-size: 0.875rem;
      color: #64748b;
      margin-top: 4px;
    }}

    /* ── Payment ID chip ── */
    .pid-row {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 28px;
      font-size: 0.85rem;
    }}
    .pid-label {{ color: #64748b; font-weight: 500; }}
    .pid-value {{ font-weight: 700; color: #0f172a; font-family: ui-monospace, monospace; font-size: 0.8rem; }}

    /* ── Form ── */
    .form-group {{ margin-bottom: 18px; }}

    label {{
      display: block;
      font-size: 0.78rem;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: .05em;
      margin-bottom: 6px;
    }}

    input {{
      width: 100%;
      padding: 12px 14px;
      border: 1.5px solid #e2e8f0;
      border-radius: 9px;
      font-size: 0.95rem;
      color: #0f172a;
      outline: none;
      transition: border-color .15s;
      background: #fff;
    }}
    input:focus {{ border-color: {meta["color"]}; box-shadow: 0 0 0 3px {meta["color"]}20; }}
    input::placeholder {{ color: #cbd5e1; }}

    .row {{ display: flex; gap: 12px; }}
    .row .form-group {{ flex: 1; }}

    /* ── Pay button ── */
    .btn-pay {{
      width: 100%;
      margin-top: 8px;
      padding: 15px 0;
      border: none;
      border-radius: 10px;
      background: {meta["color"]};
      color: #fff;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: -.01em;
      transition: opacity .15s, transform .1s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }}
    .btn-pay:hover:not(:disabled)  {{ opacity: .88; }}
    .btn-pay:active:not(:disabled) {{ transform: scale(.98); }}
    .btn-pay:disabled              {{ opacity: .55; cursor: not-allowed; }}

    .spinner {{
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .65s linear infinite;
      display: none;
    }}
    @keyframes spin {{ to {{ transform: rotate(360deg); }} }}

    /* ── Error ── */
    .error-box {{
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      font-size: 0.84rem;
      padding: 12px 14px;
      border-radius: 8px;
      margin-top: 14px;
      display: none;
    }}

    /* ── Success state ── */
    .success-wrap {{
      text-align: center;
      padding: 16px 0 8px;
      display: none;
    }}
    .success-icon  {{ font-size: 3.5rem; margin-bottom: 14px; display: block; }}
    .success-wrap h2 {{
      font-size: 1.4rem; font-weight: 700;
      color: #065f46; letter-spacing: -.02em;
    }}
    .success-wrap p  {{ color: #64748b; font-size: 0.9rem; margin-top: 6px; }}

    .btn-return {{
      display: inline-block;
      margin-top: 22px;
      padding: 12px 28px;
      background: #10b981;
      color: #fff;
      border-radius: 9px;
      font-weight: 700;
      font-size: 0.95rem;
      text-decoration: none;
      transition: opacity .15s;
    }}
    .btn-return:hover {{ opacity: .85; }}

    /* ── Footer note ── */
    .footer-note {{
      margin-top: 22px;
      text-align: center;
      font-size: 0.75rem;
      color: #94a3b8;
    }}
  </style>
</head>
<body>
  <div class="card" id="card">

    <div class="header">
      <div class="provider-badge">
        <div class="provider-dot">{meta["logo"]}</div>
        {meta["label"]} Checkout
      </div>
      <span class="lock-icon">🔒</span>
      <h1>Complete Payment</h1>
      <p class="subtitle">Your connection is encrypted and secure</p>
    </div>

    <div class="pid-row">
      <span class="pid-label">Payment ID</span>
      <span class="pid-value">#{payment_id}</span>
    </div>

    <div class="form-group">
      <label>Card Number</label>
      <input id="card-number" type="text" placeholder="4242 4242 4242 4242"
             maxlength="19" inputmode="numeric" autocomplete="cc-number" />
    </div>

    <div class="row">
      <div class="form-group">
        <label>Expiry</label>
        <input id="expiry" type="text" placeholder="MM / YY"
               maxlength="7" inputmode="numeric" autocomplete="cc-exp" />
      </div>
      <div class="form-group">
        <label>CVV</label>
        <input id="cvv" type="text" placeholder="123"
               maxlength="3" inputmode="numeric" autocomplete="cc-csc" />
      </div>
    </div>

    <div class="form-group">
      <label>Cardholder Name</label>
      <input id="name" type="text" placeholder="John Doe"
             autocomplete="cc-name" />
    </div>

    <button class="btn-pay" id="pay-btn" onclick="processPayment()">
      <div class="spinner" id="spinner"></div>
      <span id="btn-label">Pay Now</span>
    </button>

    <div class="error-box" id="error-box"></div>

    <div class="success-wrap" id="success-wrap">
      <span class="success-icon">✅</span>
      <h2>Payment Successful!</h2>
      <p>Your payment has been processed.<br/>The merchant will be notified shortly.</p>
      <a class="btn-return" href="http://localhost:3001">Return to Store</a>
    </div>

    <p class="footer-note">
      🔒 Local test environment — no real charge is made
    </p>

  </div>

  <script>
    // ── Card number formatting ──────────────────────
    document.getElementById('card-number').addEventListener('input', function (e) {{
      let v = e.target.value.replace(/\\D/g, '').slice(0, 16)
      e.target.value = v.replace(/(\\d{{4}})/g, '$1 ').trim()
    }})

    // ── Expiry formatting ───────────────────────────
    document.getElementById('expiry').addEventListener('input', function (e) {{
      let v = e.target.value.replace(/\\D/g, '').slice(0, 4)
      if (v.length >= 3) v = v.slice(0, 2) + ' / ' + v.slice(2)
      e.target.value = v
    }})

    // ── Payment processing ──────────────────────────
    async function processPayment() {{
      const btn     = document.getElementById('pay-btn')
      const spinner = document.getElementById('spinner')
      const label   = document.getElementById('btn-label')
      const errBox  = document.getElementById('error-box')

      btn.disabled    = true
      spinner.style.display = 'block'
      label.textContent     = 'Processing…'
      errBox.style.display  = 'none'

      try {{
        const res = await fetch('/payments/{token}/accept', {{ method: 'POST' }})

        if (res.ok) {{
          document.getElementById('success-wrap').style.display = 'block'
          btn.style.display     = 'none'
          errBox.style.display  = 'none'
          // Auto-redirect after 4 seconds
          setTimeout(() => window.location.href = 'http://localhost:3001', 4000)
        }} else {{
          const data = await res.json().catch(() => ({{}}))
          errBox.textContent    = data.detail || 'Payment failed. Please try again.'
          errBox.style.display  = 'block'
          btn.disabled          = false
          spinner.style.display = 'none'
          label.textContent     = 'Pay Now'
        }}
      }} catch (err) {{
        errBox.textContent    = 'Network error. Please try again.'
        errBox.style.display  = 'block'
        btn.disabled          = false
        spinner.style.display = 'none'
        label.textContent     = 'Pay Now'
      }}
    }}
  </script>
</body>
</html>"""
