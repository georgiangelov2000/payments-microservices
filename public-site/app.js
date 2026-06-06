const LARAVEL_URL = "http://localhost";
const AUTH_LOGIN_URL    = `${LARAVEL_URL}/auth/login`;
const AUTH_REGISTER_URL = `${LARAVEL_URL}/auth/register`;

// ─── Routing workflow animation ───────────────────────────────────
(function () {
  const stage = document.getElementById('wf-stage');
  if (!stage) return;

  const states = ['s1', 's2', 's3', 's4', 's5'];
  const delays = [0, 900, 1800, 3000, 4200];  // ms per phase
  const hold   = 2800;                          // ms to hold s5 before reset
  let timers   = [];
  let running  = false;

  function clearAll() {
    timers.forEach(clearTimeout);
    timers = [];
    stage.className = stage.className.replace(/\bs\d\b/g, '').trim();
  }

  function play() {
    clearAll();
    running = true;
    states.forEach((s, i) => {
      timers.push(setTimeout(() => {
        stage.classList.add(s);
      }, delays[i]));
    });
    const total = delays[delays.length - 1] + hold;
    timers.push(setTimeout(() => { clearAll(); play(); }, total));
  }

  // Start when section enters viewport
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !running) play();
    if (!entries[0].isIntersecting) { clearAll(); running = false; }
  }, { threshold: 0.3 });
  obs.observe(stage);
})();

// ─── Nav: mobile toggle + scroll state ──────────────────────────────
const nav = document.getElementById("nav");

document.querySelector("[data-nav-toggle]")?.addEventListener("click", () => {
  nav?.classList.toggle("open");
});

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", () => nav?.classList.remove("open"));
});

if (nav) {
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 12);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// ─── Scroll reveal ────────────────────────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const delay = parseInt(el.dataset.revealDelay || "0", 10);
    setTimeout(() => el.classList.add("revealed"), delay);
    revealObserver.unobserve(el);
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

document.querySelectorAll("[data-reveal]").forEach(el => revealObserver.observe(el));

// ─── Counter animation ────────────────────────────────────────────────
function animateCounter(el, target, decimals = 0) {
  const duration = 1400;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = (target * eased).toFixed(decimals);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const val = parseFloat(el.dataset.count);
    animateCounter(el, val, el.dataset.count.includes(".") ? 1 : 0);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.5 });

document.querySelectorAll("[data-count]").forEach(el => counterObserver.observe(el));

// ─── Copy to clipboard ────────────────────────────────────────────────
document.querySelectorAll("[data-copy]").forEach(button => {
  button.addEventListener("click", async () => {
    const code = button.closest(".code-window")?.querySelector("code")?.innerText
               ?? button.parentElement?.querySelector("code")?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(code);
      const orig = button.textContent;
      button.textContent = "Copied!";
      setTimeout(() => { button.textContent = orig; }, 1400);
    } catch {}
  });
});

// ─── Docs tabs ────────────────────────────────────────────────────────
document.querySelectorAll("[data-tabs]").forEach(tabs => {
  const buttons = [...tabs.querySelectorAll("[data-tab]")];
  const panels  = [...tabs.querySelectorAll("[data-tab-panel]")];
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.toggle("active", b === btn));
      panels.forEach(p => p.classList.toggle("active", p.dataset.tabPanel === btn.dataset.tab));
    });
  });
});

// ─── Active nav highlight on scroll ──────────────────────────────────
const sections = document.querySelectorAll("section[id]");
const navLinks  = document.querySelectorAll(".nav-link[href^='#']");

if (sections.length && navLinks.length) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => {
        link.style.color = link.getAttribute("href") === `#${entry.target.id}` ? "var(--ink)" : "";
      });
    });
  }, { threshold: 0.4 });
  sections.forEach(s => sectionObserver.observe(s));
}

// ─── Contact / sales form ─────────────────────────────────────────────
const contactForm    = document.getElementById("contact-form");
const contactSuccess = document.getElementById("contact-success");
const contactError   = document.getElementById("contact-error");

if (contactForm) {
  const submit   = contactForm.querySelector("button[type='submit']");
  const origText = submit?.innerHTML ?? "";

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Client-side required field check
    let valid = true;
    contactForm.querySelectorAll(".cf-label").forEach(label => {
      label.classList.remove("cf-invalid");
      const input = label.querySelector("input, select, textarea");
      if (input?.hasAttribute("required") && !input.value.trim()) {
        label.classList.add("cf-invalid");
        valid = false;
      }
    });
    if (!valid) return;

    if (contactError) { contactError.style.display = "none"; contactError.textContent = ""; }

    if (submit) { submit.innerHTML = "Sending…"; submit.disabled = true; }

    const body = {};
    new FormData(contactForm).forEach((v, k) => { if (v) body[k] = v; });

    try {
      const res  = await fetch(`${LARAVEL_URL}/api/contact`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body:    JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        contactForm.style.display = "none";
        if (contactSuccess) contactSuccess.style.display = "flex";
      } else if (res.status === 422 && json.errors) {
        Object.entries(json.errors).forEach(([field, msgs]) => {
          const input = contactForm.querySelector(`[name="${field}"]`);
          const label = input?.closest(".cf-label");
          if (label) {
            label.classList.add("cf-invalid");
            const err = label.querySelector(".cf-error");
            if (err) err.textContent = msgs[0];
          }
        });
      } else {
        if (contactError) {
          contactError.textContent = json.message ?? "Something went wrong. Please try again.";
          contactError.style.display = "block";
        }
      }
    } catch {
      if (contactError) {
        contactError.textContent = "Could not reach the server. Please try again.";
        contactError.style.display = "block";
      }
    } finally {
      if (submit) { submit.innerHTML = origText; submit.disabled = false; }
    }
  });
}

// ─── Auth forms (login + register) ───────────────────────────────────
//
// Forms on the static site POST to Laravel's JSON auth endpoints via fetch()
// with credentials:include so the session cookie is set correctly.
// Laravel returns { redirect: "..." } on success or 422 validation errors.

const loginForm    = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

if (loginForm)    wireAuthForm(loginForm,    AUTH_LOGIN_URL,    "login-error",    "Signing in…");
if (registerForm) wireAuthForm(registerForm, AUTH_REGISTER_URL, "register-error", "Creating account…");

function wireAuthForm(form, endpoint, errorBoxId, loadingText) {
  const errorBox = document.getElementById(errorBoxId);
  const submit   = form.querySelector("button[type='submit']");
  const origText = submit?.textContent ?? "";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearErrors(form, errorBox);

    if (!validateForm(form)) return;

    setLoading(submit, loadingText, true);

    const body = {};
    new FormData(form).forEach((v, k) => { body[k] = v; });

    try {
      const res = await fetch(endpoint, {
        method:      "POST",
        headers:     { "Content-Type": "application/json", "Accept": "application/json" },
        body:        JSON.stringify(body),
        credentials: "include",   // send/receive the Laravel session cookie
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        // Successful auth — redirect to the dashboard URL Laravel returned
        window.location.href = json.redirect ?? `${LARAVEL_URL}/dashboard`;
        return;
      }

      // 422 Unprocessable — map field errors back onto the form
      if (res.status === 422 && json.errors) {
        showFieldErrors(form, errorBox, json.errors);
      } else {
        showGeneralError(errorBox, json.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      showGeneralError(errorBox, "Could not reach the server. Please try again.");
    } finally {
      setLoading(submit, origText, false);
    }
  });
}

function setLoading(button, text, loading) {
  if (!button) return;
  button.textContent = text;
  button.disabled = loading;
}

function clearErrors(form, errorBox) {
  form.querySelectorAll("label").forEach(l => {
    l.classList.remove("invalid");
    const fe = l.querySelector(".field-error");
    if (fe) { fe.textContent = ""; fe.style.display = ""; }
  });
  if (errorBox) { errorBox.style.display = "none"; errorBox.textContent = ""; }
}

function showFieldErrors(form, errorBox, errors) {
  let hadFieldMatch = false;

  Object.entries(errors).forEach(([field, messages]) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (input) {
      const label = input.closest("label");
      if (label) {
        label.classList.add("invalid");
        const fe = label.querySelector(".field-error");
        if (fe) { fe.textContent = messages[0]; fe.style.display = "block"; }
      }
      hadFieldMatch = true;
    }
  });

  // If no input matched (e.g., a server-level error) show the general banner
  if (!hadFieldMatch && errorBox) {
    const first = Object.values(errors)[0]?.[0];
    showGeneralError(errorBox, first ?? "Validation failed. Please check your inputs.");
  }
}

function showGeneralError(errorBox, message) {
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.style.display = "block";
  errorBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ─── Password visibility toggle ───────────────────────────────────
document.querySelectorAll('.pass-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.querySelector('.eye-show').style.display = isPassword ? 'none' : '';
    btn.querySelector('.eye-hide').style.display = isPassword ? ''     : 'none';
    input.focus();
  });
});

// ─── Password strength ─────────────────────────────────────────────
const pwdInput    = document.getElementById('reg-password');
const strengthBar = document.getElementById('strength-bar');
if (pwdInput && strengthBar) {
  pwdInput.addEventListener('input', () => {
    const v = pwdInput.value;
    let score = 0;
    if (v.length >= 8)            score++;
    if (/[A-Z]/.test(v))          score++;
    if (/[0-9]/.test(v))          score++;
    if (/[^A-Za-z0-9]/.test(v))   score++;
    strengthBar.className = 'strength-bar' + (score > 0 ? ` s${score}` : '');
  });
}

// ─── Scroll progress bar ──────────────────────────────────────────
const progressBar = document.getElementById('scroll-progress');
if (progressBar) {
  const updateProgress = () => {
    const scrollable = document.body.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    progressBar.style.width = Math.min(pct, 100) + '%';
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

// ─── 3-D card tilt ────────────────────────────────────────────────
document.querySelectorAll('.value-card, .security-card, .provider-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width  / 2)) / (rect.width  / 2);
    const dy = (e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2);
    card.style.transform = `perspective(800px) rotateY(${dx * 7}deg) rotateX(${-dy * 7}deg) translateY(-4px)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

// ─── Live transaction feed ────────────────────────────────────────
const txnListEl = document.getElementById('txn-list');
if (txnListEl) {
  const pool = [
    { amount: '$312.00', provider: 'Stripe', cls: 'stripe', status: 'Complete', sCls: 'success' },
    { amount: '$49.99',  provider: 'PayPal', cls: 'paypal', status: 'Pending',  sCls: 'pending' },
    { amount: '$87.50',  provider: 'Stripe', cls: 'stripe', status: 'Complete', sCls: 'success' },
    { amount: '$750.00', provider: 'PayPal', cls: 'paypal', status: 'Complete', sCls: 'success' },
    { amount: '$22.00',  provider: 'Stripe', cls: 'stripe', status: 'Failed',   sCls: 'failed'  },
    { amount: '$199.00', provider: 'Stripe', cls: 'stripe', status: 'Complete', sCls: 'success' },
    { amount: '$15.99',  provider: 'PayPal', cls: 'paypal', status: 'Pending',  sCls: 'pending' },
    { amount: '$540.00', provider: 'Stripe', cls: 'stripe', status: 'Complete', sCls: 'success' },
  ];
  let poolIdx = 0;

  const tickTimes = () => {
    txnListEl.querySelectorAll('.txn-row .txn-time').forEach(el => {
      const txt = el.textContent.trim();
      const secMatch = txt.match(/^(\d+)s ago$/);
      const minMatch = txt.match(/^(\d+)m ago$/);
      if (secMatch) {
        const s = parseInt(secMatch[1]) + 3;
        el.textContent = s >= 60 ? '1m ago' : `${s}s ago`;
      } else if (minMatch) {
        el.textContent = `${parseInt(minMatch[1]) + 1}m ago`;
      }
    });
  };

  const addTransaction = () => {
    const rows = [...txnListEl.querySelectorAll('.txn-row')];
    if (rows.length >= 4) rows[rows.length - 1].remove();
    rows.forEach(r => r.classList.remove('txn-new'));
    tickTimes();

    const t = pool[poolIdx % pool.length];
    poolIdx++;

    const row = document.createElement('div');
    row.className = 'txn-row txn-new';
    row.innerHTML = `<strong>${t.amount}</strong><span class="provider-tag ${t.cls}">${t.provider}</span><span class="status-tag ${t.sCls}">${t.status}</span><span class="txn-time">2s ago</span>`;
    txnListEl.querySelector('.txn-head').after(row);
  };

  setInterval(addTransaction, 2800);
}

// ─── Testimonials carousel ────────────────────────────────────────
(function () {
  const sliderEl = document.getElementById('testimonials-slider');
  const dotsEl   = document.getElementById('t-dots');
  const prevBtn  = document.getElementById('t-prev');
  const nextBtn  = document.getElementById('t-next');
  if (!sliderEl || !dotsEl) return;

  const data = [
    {
      quote: "We cut our provider integration time from 3 weeks to 2 days. PayFlow's single API contract means we never touch merchant code when adding a new processor.",
      name: 'Sarah Kim', role: 'CTO at TechCorp', initials: 'SK',
    },
    {
      quote: "The failover routing saved us during a Stripe outage. PayPal picked up automatically — our merchants didn't notice a thing. That's exactly what we paid for.",
      name: 'Marcus Chen', role: 'VP Engineering at Shopflow', initials: 'MC',
    },
    {
      quote: "Full workflow visibility in one panel. Our support team finally stopped asking engineers for logs. Every provider event is timestamped and always available.",
      name: 'Priya Patel', role: 'Head of Payments at Orderbase', initials: 'PP',
    },
    {
      quote: "The sandbox simulation let us stress-test our routing rules before going live. The circuit breaker logic alone saved us from a bad production incident.",
      name: 'Alex Rivera', role: 'Lead Engineer at Checkout.dev', initials: 'AR',
    },
  ];

  let current = 0;
  let timer;

  data.forEach((t, i) => {
    const item = document.createElement('div');
    item.className = 'testimonial-item' + (i === 0 ? ' active' : '');
    item.innerHTML = `
      <div class="testimonial-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
      <p class="testimonial-quote">&ldquo;${t.quote}&rdquo;</p>
      <div class="testimonial-author">
        <div class="testimonial-avatar">${t.initials}</div>
        <div class="testimonial-meta"><strong>${t.name}</strong><span>${t.role}</span></div>
      </div>`;
    sliderEl.appendChild(item);

    const dot = document.createElement('button');
    dot.className = 't-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Testimonial ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(dot);
  });

  const items = sliderEl.querySelectorAll('.testimonial-item');
  const dots  = dotsEl.querySelectorAll('.t-dot');

  function goTo(idx) {
    items[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = ((idx % data.length) + data.length) % data.length;
    items[current].classList.add('active');
    dots[current].classList.add('active');
    resetTimer();
  }

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 5500);
  }

  prevBtn?.addEventListener('click', () => goTo(current - 1));
  nextBtn?.addEventListener('click', () => goTo(current + 1));
  sliderEl.addEventListener('mouseenter', () => clearInterval(timer));
  sliderEl.addEventListener('mouseleave', resetTimer);

  resetTimer();
})();

// ─── Client-side form validation ──────────────────────────────────
function validateForm(form) {
  let valid = true;

  form.querySelectorAll("input, select").forEach(input => {
    if (input.type === "checkbox") return;
    if (!input.checkValidity()) {
      input.closest("label")?.classList.add("invalid");
      valid = false;
    }
  });

  const password = form.querySelector("input[name='password']");
  const confirm  = form.querySelector("input[name='password_confirmation']");
  if (password && confirm && password.value !== confirm.value) {
    confirm.closest("label")?.classList.add("invalid");
    const fe = confirm.closest("label")?.querySelector(".field-error");
    if (fe) { fe.textContent = "Passwords must match."; fe.style.display = "block"; }
    valid = false;
  }

  return valid;
}
