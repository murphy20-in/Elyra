/**
 * Scroll-driven page behaviour: reveal-on-enter, animated counters,
 * the progress bar, scroll-spy nav highlighting, and the nav's
 * scrolled state.
 *
 * Every effect degrades to its finished state when IntersectionObserver
 * is missing or reduced motion is requested — content is never gated
 * behind an animation that may not run.
 */

import { $, $$, clamp, prefersReducedMotion, supportsObserver } from "./dom.js";

/* ------------------------------------------------------------------
   Reveal
   ------------------------------------------------------------------ */
export function setupReveal() {
  const items = $$(".reveal");
  if (!items.length) return;

  const show = (el) => el.classList.add("is-visible");

  if (!supportsObserver() || prefersReducedMotion()) {
    items.forEach(show);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        // Stagger siblings so a grid cascades instead of popping at once
        const delay = Number(entry.target.dataset.revealDelay || 0);
        setTimeout(() => show(entry.target), delay);
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
  );

  items.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------
   Counters
   ------------------------------------------------------------------ */
function animateNumber(to, duration, onFrame) {
  const start = performance.now();

  function tick(now) {
    const progress = clamp((now - start) / duration, 0, 1);
    // easeOutCubic — fast start, soft landing
    const eased = 1 - Math.pow(1 - progress, 3);
    onFrame(Math.round(to * eased));
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

export function setupCounters() {
  const counters = $$("[data-counter]");
  if (!counters.length) return;

  const play = (el) => {
    const target = Number(el.dataset.counter);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    if (Number.isNaN(target)) return;

    if (prefersReducedMotion()) {
      el.textContent = `${prefix}${target}${suffix}`;
      return;
    }

    animateNumber(target, 1400, (value) => {
      el.textContent = `${prefix}${value}${suffix}`;
    });
  };

  if (!supportsObserver()) {
    counters.forEach(play);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        play(entry.target);
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.6 }
  );

  counters.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------
   Scroll progress + nav state
   ------------------------------------------------------------------ */
export function setupScrollProgress() {
  const bar = $("#scrollProgressBar");
  const nav = $(".nav-shell");
  let ticking = false;

  function paint() {
    const scrolled = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;

    if (bar) {
      const pct = max > 0 ? (scrolled / max) * 100 : 0;
      bar.style.width = `${clamp(pct, 0, 100)}%`;
    }

    if (nav) nav.classList.toggle("is-stuck", scrolled > 24);

    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(paint);
    },
    { passive: true }
  );

  paint();
}

/* ------------------------------------------------------------------
   Scroll spy — highlights the nav link for the section in view
   ------------------------------------------------------------------ */
export function setupScrollSpy() {
  const links = $$(".nav-links a[href^='#']");
  if (!links.length || !supportsObserver()) return;

  const byId = new Map(links.map((link) => [link.getAttribute("href").slice(1), link]));
  const sections = Array.from(byId.keys())
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = byId.get(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach((l) => l.classList.remove("is-active"));
          link.classList.add("is-active");
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );

  sections.forEach((section) => io.observe(section));
}

/* ------------------------------------------------------------------
   Smooth scroll for [data-scroll] buttons
   ------------------------------------------------------------------ */
export function setupScrollButtons() {
  $$("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.querySelector(button.dataset.scroll);
      if (!target) return;
      target.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    });
  });
}
