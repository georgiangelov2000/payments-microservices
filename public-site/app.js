const appUrl = "http://localhost";

document.querySelector("[data-nav-toggle]")?.addEventListener("click", event => {
  event.currentTarget.closest(".nav")?.classList.toggle("open");
});

document.querySelectorAll("[data-copy]").forEach(button => {
  button.addEventListener("click", async () => {
    const code = button.parentElement?.querySelector("code")?.innerText ?? "";
    await navigator.clipboard.writeText(code);
    const original = button.innerText;
    button.innerText = "Copied";
    setTimeout(() => {
      button.innerText = original;
    }, 1200);
  });
});

document.querySelectorAll("[data-tabs]").forEach(tabs => {
  const buttons = [...tabs.querySelectorAll("[data-tab]")];
  const panels = [...tabs.querySelectorAll("[data-tab-panel]")];

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      buttons.forEach(item => item.classList.toggle("active", item === button));
      panels.forEach(panel => {
        panel.classList.toggle("active", panel.dataset.tabPanel === button.dataset.tab);
      });
    });
  });
});

document.querySelectorAll("[data-auth-form], [data-register-form]").forEach(form => {
  form.addEventListener("submit", event => {
    event.preventDefault();

    if (!validateForm(form)) return;

    const button = form.querySelector("button[type='submit']");
    const loadingText = button?.dataset.loadingText ?? "Loading...";

    if (button) {
      button.dataset.originalText = button.innerText;
      button.innerText = loadingText;
      button.disabled = true;
    }

    setTimeout(() => {
      window.location.href = form.dataset.redirect || `${appUrl}/dashboard`;
    }, 500);
  });
});

function validateForm(form) {
  let valid = true;
  const labels = [...form.querySelectorAll("label")];

  labels.forEach(label => label.classList.remove("invalid"));
  form.querySelector(".terms-error")?.classList.remove("visible");

  form.querySelectorAll("input, select").forEach(input => {
    if (input.type === "checkbox") return;

    if (!input.checkValidity()) {
      input.closest("label")?.classList.add("invalid");
      valid = false;
    }
  });

  const password = form.querySelector("input[name='password']");
  const confirmation = form.querySelector("input[name='password_confirmation']");
  if (password && confirmation && password.value !== confirmation.value) {
    confirmation.closest("label")?.classList.add("invalid");
    valid = false;
  }

  const terms = form.querySelector("input[name='terms']");
  if (terms && !terms.checked) {
    form.querySelector(".terms-error")?.classList.add("visible");
    valid = false;
  }

  return valid;
}
