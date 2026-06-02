const LARAVEL_URL = "http://localhost";
const AUTH_LOGIN_URL    = `${LARAVEL_URL}/auth/login`;
const AUTH_REGISTER_URL = `${LARAVEL_URL}/auth/register`;

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

// ─── Client-side form validation (unchanged) ──────────────────────────
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
