const appUrl = "http://localhost";

// ─── Nav: mobile toggle + scroll state ──────────────────────────────
const nav = document.getElementById("nav");

document.querySelector("[data-nav-toggle]")?.addEventListener("click", () => {
  nav?.classList.toggle("open");
});

// Close mobile nav on link click
document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", () => nav?.classList.remove("open"));
});

if (nav) {
  const onScroll = () => {
    nav.classList.toggle("scrolled", window.scrollY > 12);
  };
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
function animateCounter(el, target, decimals = 0, suffix = "") {
  const duration = 1400;
  const start = performance.now();
  const from = 0;

  const step = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (target - from) * eased;
    el.textContent = current.toFixed(decimals) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const val = parseFloat(el.dataset.count);
    const decimals = el.dataset.count.includes(".") ? 1 : 0;
    animateCounter(el, val, decimals);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.5 });

document.querySelectorAll("[data-count]").forEach(el => counterObserver.observe(el));

// ─── Copy to clipboard ────────────────────────────────────────────────
document.querySelectorAll("[data-copy]").forEach(button => {
  button.addEventListener("click", async () => {
    const code = button.closest(".code-window")?.querySelector("code")?.innerText
               ?? button.parentElement?.querySelector("code")?.innerText
               ?? "";
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

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      buttons.forEach(b => b.classList.toggle("active", b === button));
      panels.forEach(p => p.classList.toggle("active", p.dataset.tabPanel === button.dataset.tab));
    });
  });
});

// ─── Auth / register forms ────────────────────────────────────────────
document.querySelectorAll("[data-auth-form], [data-register-form]").forEach(form => {
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!validateForm(form)) return;

    const button = form.querySelector("button[type='submit']");
    if (button) {
      button.dataset.originalText = button.textContent;
      button.textContent = button.dataset.loadingText ?? "Loading…";
      button.disabled = true;
    }

    setTimeout(() => {
      window.location.href = form.dataset.redirect || `${appUrl}/dashboard`;
    }, 600);
  });
});

function validateForm(form) {
  let valid = true;
  form.querySelectorAll("label").forEach(l => l.classList.remove("invalid"));
  form.querySelector(".terms-error")?.classList.remove("visible");

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
    valid = false;
  }

  const terms = form.querySelector("input[name='terms']");
  if (terms && !terms.checked) {
    form.querySelector(".terms-error")?.classList.add("visible");
    valid = false;
  }

  return valid;
}

// ─── Smooth active nav link highlighting ─────────────────────────────
const sections = document.querySelectorAll("section[id]");
const navLinks  = document.querySelectorAll(".nav-link[href^='#']");

if (sections.length && navLinks.length) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => {
        link.style.color = link.getAttribute("href") === `#${entry.target.id}`
          ? "var(--ink)"
          : "";
      });
    });
  }, { threshold: 0.4 });

  sections.forEach(s => sectionObserver.observe(s));
}
