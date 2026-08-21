/**
 * Landing page behaviour.
 *
 * Everything here is specific to the marketing surface: the mobile
 * menu, the FAQ accordion, the email hand-off into signup, and a
 * backend liveness probe. Shared scroll/reveal machinery lives in
 * core/motion.js.
 */

import { $, $$, delegate } from "../core/dom.js";
import { toast } from "../core/toast.js";
import { api } from "../core/api.js";

/* ------------------------------------------------------------------
   Mobile navigation
   ------------------------------------------------------------------ */
export function setupMobileNav() {
  const toggle = $("#navToggle");
  const menu = $("#mobileNav");
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    menu.hidden = !open;
  };

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  // Any navigation choice closes the menu
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  // Clicking away closes it, but clicks inside the menu or on the
  // toggle itself must not immediately re-close what they just opened
  document.addEventListener("click", (event) => {
    if (menu.hidden) return;
    if (event.target.closest("#mobileNav, #navToggle")) return;
    setOpen(false);
  });
}

/* ------------------------------------------------------------------
   FAQ — one answer open at a time
   ------------------------------------------------------------------ */
export function setupFaq() {
  const items = $$(".faq-item");
  if (!items.length) return;

  items.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      items.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });
}

/* ------------------------------------------------------------------
   Signup hand-off
   The landing page never collects a password. It validates the email,
   stashes it, and hands off to the real signup flow so the address is
   pre-filled there.
   ------------------------------------------------------------------ */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SIGNUP_URL = "signup.html";

function stashEmail(email) {
  try {
    sessionStorage.setItem("elyra.signup.email", email);
  } catch {
    /* non-fatal — signup just starts with an empty field */
  }
}

/**
 * Signup lives on a page that may not be deployed yet. Probe it rather
 * than dropping the visitor onto a 404.
 */
async function goToSignup() {
  try {
    const res = await fetch(SIGNUP_URL, { method: "HEAD" });
    if (res.ok) {
      window.location.href = SIGNUP_URL;
      return;
    }
  } catch {
    /* fall through to the message below */
  }
  toast("Signup isn't wired up yet — that flow is next.");
}

export function setupSignupCta() {
  const form = $("#signupForm");

  if (form) {
    const input = $("#signupEmail", form);
    const error = $("#signupError", form);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = input.value.trim();

      if (!EMAIL_PATTERN.test(email)) {
        error.textContent = "Enter an email address we can reach you at.";
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return;
      }

      error.textContent = "";
      input.removeAttribute("aria-invalid");
      stashEmail(email);
      goToSignup();
    });

    // Clear the error as soon as they start fixing it
    input.addEventListener("input", () => {
      error.textContent = "";
      input.removeAttribute("aria-invalid");
    });
  }

  delegate(document, "click", "[data-cta='signup']", (event) => {
    event.preventDefault();
    goToSignup();
  });
}

/* ------------------------------------------------------------------
   Backend status
   A quiet liveness probe. The chip's wording is marketing copy and
   stays put either way — only the dot changes, so a cold backend
   never costs us the headline message.
   ------------------------------------------------------------------ */
export async function setupApiStatus() {
  const dot = $("#apiStatusDot");
  if (!dot) return;

  try {
    await api.health();
    dot.dataset.status = "up";
  } catch {
    dot.dataset.status = "degraded";
  }
}

export function initLanding() {
  setupMobileNav();
  setupFaq();
  setupSignupCta();
  setupApiStatus();
}
