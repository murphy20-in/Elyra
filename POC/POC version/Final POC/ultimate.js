/* ============================================================
   ELYRA · ULTIMATE INVESTOR POC
   All flows are local simulations · no backend.

   Architecture: small self-contained modules registered in
   MODULES and booted once on DOMContentLoaded. Every module
   degrades gracefully if its DOM is missing, and every
   animation respects prefers-reduced-motion at call time.
   ============================================================ */

"use strict";

/* ============================================================
   UTILITIES
   ============================================================ */
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointerQuery = window.matchMedia("(pointer: fine)");

const prefersReducedMotion = () => reducedMotionQuery.matches;
const hasFinePointer = () => finePointerQuery.matches;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Tween a number with ease-out cubic. Jumps straight to the end
 * value when the user prefers reduced motion.
 */
function animateNumber(from, to, duration, onFrame) {
  if (prefersReducedMotion()) {
    onFrame(to);
    return;
  }
  const start = performance.now();
  function tick(now) {
    const t = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    onFrame(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ----- Toast ----- */
const toastEl = $("#toast");
let toastTimer;
function toast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("active");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("active"), 3200);
}

/* ----- Meter animation ---------------------------------------
   Meters ship with their target width inline in the HTML so the
   page is meaningful without JS. On boot we capture the target,
   zero the bar, and let activation animate it back in. */
function captureMeterTargets(scope) {
  $$(".meter > i, .risk-bar > i", scope).forEach((bar) => {
    if (!bar.dataset.target) bar.dataset.target = bar.style.width || "0%";
  });
}

function playMeters(scope) {
  const bars = $$(".meter > i, .risk-bar > i", scope);
  if (prefersReducedMotion()) {
    bars.forEach((bar) => (bar.style.width = bar.dataset.target));
    return;
  }
  bars.forEach((bar) => {
    bar.style.transition = "none";
    bar.style.width = "0%";
  });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bars.forEach((bar) => {
        bar.style.transition = "";
        bar.style.width = bar.dataset.target;
      });
    });
  });
}

/* ----- Generic tablist keyboard support ----------------------
   Roving tabindex + arrow keys, per WAI-ARIA authoring practices. */
function setupTablistKeys(tabs, activate) {
  tabs.forEach((tab, index) => {
    tab.addEventListener("keydown", (event) => {
      let next = null;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        next = (index + 1) % tabs.length;
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        next = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = tabs.length - 1;
      }
      if (next === null) return;
      event.preventDefault();
      activate(tabs[next]);
      tabs[next].focus();
    });
  });
}

function syncTabState(tabs, activeTab) {
  tabs.forEach((tab) => {
    const isActive = tab === activeTab;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
    tab.tabIndex = isActive ? 0 : -1;
  });
}

/* ============================================================
   NAVIGATION · scroll progress, scrollspy, mobile menu
   ============================================================ */
function setupScrollProgress() {
  const bar = $("#scrollProgressBar");
  if (!bar) return;
  let ticking = false;

  function paint() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? clamp(window.scrollY / max, 0, 1) : 0})`;
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(paint);
      }
    },
    { passive: true }
  );
  paint();
}

function setupScrollSpy() {
  const links = $$(".nav-links a[href^='#']");
  if (!links.length || !("IntersectionObserver" in window)) return;

  const byId = new Map(links.map((link) => [link.getAttribute("href").slice(1), link]));
  const sections = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean);

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => link.removeAttribute("aria-current"));
        const link = byId.get(entry.target.id);
        if (link) link.setAttribute("aria-current", "true");
      });
    },
    { rootMargin: "-38% 0px -52% 0px" }
  );
  sections.forEach((section) => io.observe(section));
}

function setupMobileNav() {
  const toggle = $("#navToggle");
  const menu = $("#mobileNav");
  if (!toggle || !menu) return;

  function setOpen(open) {
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
  }

  toggle.addEventListener("click", () => setOpen(menu.hidden));

  // Any selection inside the menu dismisses it.
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (menu.hidden) return;
    if (!menu.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
  });
}

function setupScrollButtons() {
  $$("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.querySelector(button.dataset.scroll || "");
      if (!target) return;
      target.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start"
      });
    });
  });
}

/* ============================================================
   REVEAL ON SCROLL + COUNTERS
   ============================================================ */
function setupReveal() {
  const items = $$(".reveal");
  if (!items.length) return;

  const finish = (el) => {
    el.classList.add("visible");
    // After the stagger completes, hand transitions back to the
    // cards so hover lifts feel snappy instead of inheriting the
    // slow entrance timing.
    if (el.hasAttribute("data-stagger")) {
      setTimeout(() => el.classList.add("done"), prefersReducedMotion() ? 0 : 1100);
    }
  };

  if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
    items.forEach(finish);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          finish(entry.target);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );
  items.forEach((el) => io.observe(el));
}

function setupCounters() {
  const counters = $$("[data-counter]");
  if (!counters.length) return;

  const play = (el) => {
    const target = Number(el.dataset.counter);
    const suffix = el.dataset.suffix || "";
    animateNumber(0, target, 1400, (value) => {
      el.textContent = `${value}${suffix}`;
    });
  };

  if (!("IntersectionObserver" in window)) {
    counters.forEach(play);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          play(entry.target);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach((el) => io.observe(el));
}

/* ============================================================
   AUTH MODAL · focus trap, scroll lock, focus restore
   ============================================================ */
function setupAuthModal() {
  const modal = $("#authModal");
  if (!modal) return;
  const dialog = $(".modal", modal);
  let lastFocused = null;

  const focusables = () =>
    $$("button, input, a[href], [tabindex]:not([tabindex='-1'])", dialog).filter(
      (el) => !el.disabled && el.offsetParent !== null
    );

  function open() {
    lastFocused = document.activeElement;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    const items = focusables();
    (items.find((el) => el.tagName === "INPUT") || items[0])?.focus();
  }

  function close() {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
  }

  $$("[data-open-auth]").forEach((button) => button.addEventListener("click", open));
  $$("[data-close-modal]").forEach((button) => button.addEventListener("click", close));

  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });

  document.addEventListener("keydown", (event) => {
    if (!modal.classList.contains("active")) return;

    if (event.key === "Escape") {
      close();
      return;
    }

    if (event.key === "Tab") {
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
}

/* ============================================================
   ONBOARDING · auth tabs + intent picker
   ============================================================ */
function setupAuthTabs() {
  const tabs = $$("[data-auth-tab]");
  if (!tabs.length) return;

  function activate(tab) {
    syncTabState(tabs, tab);
    $$(".auth-form").forEach((form) => {
      const isActive = form.id === `${tab.dataset.authTab}Form`;
      form.classList.toggle("active", isActive);
      form.hidden = !isActive;
    });
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => activate(tab)));
  setupTablistKeys(tabs, activate);
}

function setupIntentPicker() {
  const explainCopy = {
    Exploring: "Discovery prioritizes gentle pacing, shared boundaries, and low-pressure introductions.",
    Serious: "Discovery prioritizes long-term alignment, preference fit, and verified profiles.",
    Discreet: "Privacy surfaces become prominent: anonymous chat, reveal pacing, and Safe Date prompts.",
    Friendship: "Discovery favors community, trust-building, and lower-stakes introductions."
  };

  const buttons = $$("[data-intent]");
  const explain = $("#intentExplain");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const intent = button.dataset.intent;
      if (explain) {
        explain.replaceChildren();
        const title = document.createElement("strong");
        title.textContent = `${intent} selected`;
        const body = document.createElement("span");
        body.textContent = explainCopy[intent] || "";
        explain.append(title, body);
      }
      toast(`${intent} intent applied to the simulated profile.`);
    });
  });
}

/* ============================================================
   DEMO RAIL · tab panels, keyboard nav, guided tour
   ============================================================ */
const PANEL_ORDER = ["onboarding", "identity", "matching", "chat", "safe"];
const tourState = { timer: null, active: false };

function activatePanel(name, options = {}) {
  const steps = $$(".rail-step");
  const panels = $$("[data-panel-view]");
  const activeStep = steps.find((step) => step.dataset.panel === name);
  if (!activeStep) return;

  syncTabState(steps, activeStep);

  panels.forEach((panel) => {
    const isActive = panel.dataset.panelView === name;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
    if (isActive) playMeters(panel);
  });

  const progress = $("#railProgress");
  if (progress) {
    progress.textContent = `${Math.max(0, PANEL_ORDER.indexOf(name)) + 1} / 5`;
  }

  if (!options.fromTour) stopTour();
}

function stopTour() {
  if (!tourState.active) return;
  tourState.active = false;
  clearTimeout(tourState.timer);
  $$(".rail-step").forEach((step) => step.classList.remove("touring"));
  const button = $("#railTour");
  const label = $("#railTourLabel");
  if (button) button.setAttribute("aria-pressed", "false");
  if (label) label.textContent = "Play 90-second tour";
}

function startTour() {
  const button = $("#railTour");
  const label = $("#railTourLabel");
  const stepDuration = prefersReducedMotion() ? 4200 : 6200;
  tourState.active = true;
  if (button) button.setAttribute("aria-pressed", "true");
  if (label) label.textContent = "Stop tour";

  let index = 0;

  function advance() {
    if (!tourState.active) return;
    const name = PANEL_ORDER[index];
    activatePanel(name, { fromTour: true });

    const step = $$(".rail-step").find((item) => item.dataset.panel === name);
    $$(".rail-step").forEach((item) => item.classList.remove("touring"));
    if (step && !prefersReducedMotion()) {
      step.style.setProperty("--tour-ms", `${stepDuration}ms`);
      step.classList.add("touring");
    }

    index += 1;
    if (index >= PANEL_ORDER.length) {
      tourState.timer = setTimeout(() => {
        stopTour();
        toast("Tour complete. Every flow stays interactive — explore freely.");
      }, stepDuration);
      return;
    }
    tourState.timer = setTimeout(advance, stepDuration);
  }

  advance();
  toast("Guided tour started · walking the full investor flow.");
}

function setupDemoRail() {
  const steps = $$(".rail-step");
  if (!steps.length) return;

  captureMeterTargets(document);

  steps.forEach((step) => {
    step.addEventListener("click", () => {
      activatePanel(step.dataset.panel);
      const label = step.querySelector(".rail-label strong")?.textContent || "Step";
      toast(`${label} flow active.`);
    });

    // Tour progress track, built once per step.
    const track = document.createElement("i");
    track.className = "tour-progress";
    track.setAttribute("aria-hidden", "true");
    step.appendChild(track);
  });

  setupTablistKeys(steps, (step) => activatePanel(step.dataset.panel));

  $$("[data-rail-jump]").forEach((button) => {
    button.addEventListener("click", () => activatePanel(button.dataset.railJump));
  });

  const tourButton = $("#railTour");
  if (tourButton) {
    tourButton.addEventListener("click", () => {
      if (tourState.active) {
        stopTour();
        toast("Tour paused. Pick any step to continue manually.");
      } else {
        startTour();
      }
    });
  }
}

/* ============================================================
   IDENTITY · consented reveal simulation
   ============================================================ */
function setupIdentityReveal() {
  const privateSide = $("#privateSide");
  const button = $("#unlockProfile");
  const audit = $("#revealAudit");
  const lockChip = $("#lockChip");
  if (!privateSide || !button || !audit || !lockChip) return;
  let unlocked = false;

  button.addEventListener("click", () => {
    unlocked = !unlocked;
    privateSide.classList.toggle("locked", !unlocked);
    privateSide.classList.toggle("unlocked", unlocked);
    lockChip.textContent = unlocked ? "Revealed" : "Locked";
    lockChip.classList.toggle("unlocked", unlocked);
    button.textContent = unlocked ? "Revoke reveal access" : "Simulate consented reveal";
    audit.textContent = unlocked
      ? "Audit event written: private_profile.reveal · revocable, time-bound consent."
      : "Awaiting consent. Reveal actions are audit-logged and revocable.";

    $$("[data-secret]", privateSide).forEach((field) => {
      field.textContent = unlocked ? field.dataset.secret : "Encrypted field";
    });

    toast(unlocked ? "Private identity layer revealed with consent." : "Reveal revoked. Fields re-encrypted.");
  });
}

/* ============================================================
   MATCHING · explainable candidate rotation
   ============================================================ */
const candidates = [
  {
    avatar: "AR",
    name: "Aarav · 28",
    meta: "Bengaluru · he/they · discreet",
    score: "92%",
    bio: "Prefers verified, slow-paced connections, public first meetings, and clear boundaries.",
    reasons: ["Exact intent alignment", "High preference overlap", "Low risk · verified"],
    bars: [96, 88, 74, 91]
  },
  {
    avatar: "NY",
    name: "Niyati · 31",
    meta: "Delhi NCR · she/her · serious",
    score: "87%",
    bio: "Values long-form conversation, transparent expectations, and identity-safe introductions.",
    reasons: ["Serious intent overlap", "Strong embedding similarity", "Within age preference"],
    bars: [88, 91, 63, 82]
  },
  {
    avatar: "IV",
    name: "Ivaan · 25",
    meta: "Mumbai · they/them · friendship",
    score: "83%",
    bio: "Looking for queer community, art events, and slow trust-building before dating.",
    reasons: ["Shared community interests", "City-level proximity", "Verified photo history"],
    bars: [76, 86, 92, 78]
  },
  {
    avatar: "KS",
    name: "Kabir · 29",
    meta: "Pune · he/him · exploring",
    score: "89%",
    bio: "Software engineer, queer, exploring slow connection. Prefers verified profiles and Safe Date workflows.",
    reasons: ["Exploring intent match", "High verification trust", "Compatible boundaries"],
    bars: [94, 84, 80, 86]
  }
];

let candidateIndex = 0;

function renderCandidate(next) {
  const card = $("#candidateCard");
  const bars = $$("[data-score-row] .meter > i");
  if (!card) return;

  card.classList.remove("swap", "accepted", "passed");
  void card.offsetWidth;
  if (!prefersReducedMotion()) card.classList.add("swap");

  $("#candidateAvatar").textContent = next.avatar;
  $("#candidateName").textContent = next.name;
  $("#candidateMeta").textContent = next.meta;
  $("#candidateScore").textContent = next.score;
  $("#candidateBio").textContent = next.bio;

  const stack = $("#reasonStack");
  if (stack) {
    stack.replaceChildren(
      ...next.reasons.map((reason) => {
        const tag = document.createElement("span");
        tag.textContent = reason;
        return tag;
      })
    );
  }

  bars.forEach((bar, idx) => {
    bar.dataset.target = `${next.bars[idx]}%`;
    bar.style.width = `${next.bars[idx]}%`;
  });

  const result = $("#matchResult");
  if (result) result.textContent = "Candidate ready · no swipe queue, only explainable intent cards.";
}

function setupMatching() {
  const generate = $("#generateMatch");
  const like = $("#likeMatch");
  const pass = $("#passMatch");
  const card = $("#candidateCard");
  const result = $("#matchResult");
  if (!generate || !card || !like || !pass) return;

  generate.addEventListener("click", () => {
    candidateIndex = (candidateIndex + 1) % candidates.length;
    renderCandidate(candidates[candidateIndex]);
    toast(`Generated explainable match: ${candidates[candidateIndex].name}.`);
  });

  like.addEventListener("click", () => {
    card.classList.remove("passed");
    card.classList.add("accepted");
    if (result) {
      result.replaceChildren();
      const strong = document.createElement("strong");
      strong.textContent = "Mutual match created.";
      result.append(strong, " Chat thread provisioned · match.created event simulated.");
    }
    toast("Match simulated. Opening moderated chat.");
    setTimeout(() => activatePanel("chat"), prefersReducedMotion() ? 0 : 700);
  });

  pass.addEventListener("click", () => {
    card.classList.remove("accepted");
    card.classList.add("passed");
    if (result) {
      result.replaceChildren();
      const strong = document.createElement("strong");
      strong.textContent = "Passed respectfully.";
      result.append(strong, " Candidate removed from local queue · no swipe mechanics.");
    }
    toast("Candidate passed. The no-swipe queue stays intent-based.");
    setTimeout(() => {
      candidateIndex = (candidateIndex + 1) % candidates.length;
      renderCandidate(candidates[candidateIndex]);
    }, prefersReducedMotion() ? 0 : 600);
  });
}

/* ============================================================
   CHAT · visible AI moderation with typing indicator
   ============================================================ */
function createBubble(text, type, sensitive = false) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${type}${sensitive ? " blurred" : ""}`;

  if (sensitive) {
    const span = document.createElement("span");
    span.textContent = "Sensitive personal detail hidden by AI moderation.";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "View anyway";
    button.addEventListener("click", () => {
      bubble.classList.add("unblurred");
      span.textContent = text;
      button.remove();
      toast("Sensitive content unblurred locally · production audits this action.");
    });
    bubble.append(span, button);
  } else {
    bubble.textContent = text;
    const meta = document.createElement("em");
    meta.className = "bubble-meta";
    meta.textContent = type === "sent" ? "Delivered" : "Read · AI checked";
    bubble.appendChild(meta);
  }
  return bubble;
}

function createTypingBubble() {
  const bubble = document.createElement("div");
  bubble.className = "bubble received typing";
  bubble.setAttribute("aria-label", "Aarav is typing");
  for (let i = 0; i < 3; i += 1) bubble.appendChild(document.createElement("b"));
  return bubble;
}

function setupChat() {
  const feed = $("#messageFeed");
  const input = $("#chatComposer");
  const send = $("#sendDemoMessage");
  const decision = $("#moderationDecision");
  const trace = $("#moderationTrace");
  const personalDataScore = $("#personalDataScore");
  const action = $("#moderationAction");
  if (!feed || !input || !send || !decision || !trace || !personalDataScore || !action) return;
  let replyTimer;
  let typingTimer;

  const scrollFeed = () => {
    feed.scrollTop = feed.scrollHeight;
  };

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    const sensitiveTerms = ["location", "phone", "address", "home", "number", "exact", "where you live"];
    const sensitive = sensitiveTerms.some((term) => text.toLowerCase().includes(term));

    feed.appendChild(createBubble(text, "sent", sensitive));
    input.value = "";

    if (sensitive) {
      decision.textContent = "Sensitive personal-detail sharing detected. Message blurred until user confirms.";
      trace.textContent = "Category: personal_data · toxicity 0.08 · action: blur";
      personalDataScore.textContent = "0.78";
      action.textContent = "Blur";
      toast("AI moderation blurred sensitive personal-detail content.");
    } else {
      decision.textContent = "No risk detected in the latest message.";
      trace.textContent = "Category: allow · toxicity 0.05 · action: deliver";
      personalDataScore.textContent = "0.10";
      action.textContent = "Allow";
      toast("Message delivered through simulated WebSocket flow.");
    }

    scrollFeed();

    // Simulated reply: brief typing indicator, then the message.
    clearTimeout(replyTimer);
    clearTimeout(typingTimer);
    $(".bubble.typing", feed)?.remove();

    typingTimer = setTimeout(() => {
      feed.appendChild(createTypingBubble());
      scrollFeed();
    }, 500);

    replyTimer = setTimeout(() => {
      $(".bubble.typing", feed)?.remove();
      feed.appendChild(
        createBubble(
          "That boundary works. We can keep exact details inside Safe Date until both sides consent.",
          "received"
        )
      );
      scrollFeed();
    }, 1700);
  }

  send.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  });

  $$("[data-unblur]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = $(button.dataset.unblur);
      if (!target) return;
      target.classList.add("unblurred");
      const label = $("span", target);
      if (label) label.textContent = "Sample sensitive detail revealed in prototype mode.";
      button.remove();
      toast("Blurred moderation sample revealed.");
    });
  });
}

/* ============================================================
   TRUST · animated composite score + risk bars
   ============================================================ */
function setupTrustAnimation() {
  const ring = $("#trustRing");
  const value = $("#trustValue");
  const summary = $("#trustSummary");
  const button = $("#animateTrust");
  const section = $(".trust-section");
  if (!ring || !value || !summary || !button || !section) return;
  let summaryTimer;
  let running = false;
  let hasRun = false;

  function run() {
    if (running) return;
    running = true;
    clearTimeout(summaryTimer);
    ring.style.setProperty("--trust", 0);
    value.textContent = "0";
    summary.textContent =
      "Recomputing report count, verification, toxicity history, account age, and fake-profile signals.";
    animateNumber(0, 91, 1100, (score) => {
      ring.style.setProperty("--trust", score);
      value.textContent = score;
    });
    playMeters(section);
    summaryTimer = setTimeout(
      () => {
        summary.textContent =
          "Score 91 · verified profile · low chat toxicity · no upheld reports · mature account.";
        running = false;
        hasRun = true;
      },
      prefersReducedMotion() ? 0 : 1180
    );
  }

  button.addEventListener("click", () => {
    running = false;
    run();
    toast("Risk score recomputed with explainability visible.");
  });

  if (!("IntersectionObserver" in window)) {
    run();
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !hasRun) run();
    },
    { threshold: 0.45 }
  );
  io.observe(section);
}

/* ============================================================
   SAFE DATE · session, check-ins, SOS
   ============================================================ */
function setupSafeDate() {
  const startBtn = $("#startSafeSession");
  const checkInBtn = $("#safeCheckIn");
  const sosBtn = $("#safeSos");
  const status = $("#safeStatus");
  const tracking = $("#safeTracking");
  const countdown = $("#safeCountdown");
  const pin = $("#userPin");
  if (!startBtn || !checkInBtn || !sosBtn || !status || !tracking || !countdown || !pin) return;

  let intervalMinutes = 15;
  let seconds = 0;
  let timerId;
  let routeId;

  function renderTimer() {
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    countdown.textContent = `${mm}:${ss}`;
    countdown.classList.toggle("urgent", seconds > 0 && seconds <= 10);
  }

  function movePin() {
    if (prefersReducedMotion()) return;
    pin.style.left = `${38 + Math.random() * 30}%`;
    pin.style.top = `${30 + Math.random() * 38}%`;
  }

  function setTracking(label, modifier = "") {
    tracking.textContent = label;
    tracking.className = "track-pill";
    if (modifier) tracking.classList.add(modifier);
  }

  function startSession() {
    clearInterval(timerId);
    clearInterval(routeId);
    seconds = Math.min(intervalMinutes * 60, 90);
    status.textContent = "Active session";
    setTracking("Live tracking on", "live");
    pin.classList.remove("alert");
    pin.classList.add("active");
    renderTimer();
    movePin();

    timerId = setInterval(() => {
      seconds = Math.max(0, seconds - 1);
      renderTimer();
      if (seconds === 0) {
        clearInterval(timerId);
        clearInterval(routeId);
        status.textContent = "Check-in due";
        setTracking("Emergency contact queued", "alert");
        toast("Check-in due. Production flow would trigger a missed-check-in event.");
      }
    }, 1000);

    routeId = setInterval(movePin, 2200);
    toast("Safe Session started · live tracking + check-in timer simulated.");
  }

  $$("[data-safe-interval]").forEach((button) => {
    button.addEventListener("click", () => {
      $$("[data-safe-interval]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      intervalMinutes = Number(button.dataset.safeInterval);
      toast(`${intervalMinutes} minute Safe Date check-in selected.`);
    });
  });

  startBtn.addEventListener("click", startSession);

  checkInBtn.addEventListener("click", () => {
    if (seconds === 0) {
      startSession();
      return;
    }
    seconds = Math.min(intervalMinutes * 60, 90);
    status.textContent = "Checked in";
    setTracking("Live tracking on", "live");
    renderTimer();
    toast("Check-in recorded · timer reset locally.");
  });

  sosBtn.addEventListener("click", () => {
    clearInterval(timerId);
    clearInterval(routeId);
    seconds = 0;
    renderTimer();
    status.textContent = "SOS triggered";
    setTracking("Emergency alert simulated", "alert");
    pin.classList.remove("active");
    pin.classList.add("alert");
    toast("SOS simulated · contact + last known location dispatched.");
  });
}

/* ============================================================
   PRICING · billing cadence with animated price transitions
   ============================================================ */
function setupPricing() {
  const priceMap = {
    monthly: { free: 0, plus: 499, premium: 999, elite: 1999 },
    yearly: { free: 0, plus: 4990, premium: 9990, elite: 19990 }
  };

  $$("[data-billing-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.classList.contains("active")) return;
      $$("[data-billing-mode]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const mode = button.dataset.billingMode;
      const prices = priceMap[mode];

      Object.entries(prices).forEach(([plan, price]) => {
        const node = $(`[data-plan-price="${plan}"]`);
        if (!node) return;
        const amount = $(".amount", node) || node;
        const per = $(".per", node);
        const current = Number(amount.textContent.replace(/[^\d]/g, "")) || 0;
        node.classList.remove("price-flip");
        void node.offsetWidth;
        if (!prefersReducedMotion()) node.classList.add("price-flip");
        if (per) per.textContent = mode === "yearly" ? "/yr" : "/mo";
        animateNumber(current, price, 520, (value) => {
          amount.textContent = `₹${value.toLocaleString("en-IN")}`;
        });
      });

      toast(`${button.dataset.billingMode === "yearly" ? "Yearly" : "Monthly"} pricing displayed.`);
    });
  });

  $$("[data-upgrade-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      toast(`${button.dataset.upgradePlan} upgrade prompt simulated · no payment request sent.`);
    });
  });
}

/* ============================================================
   POINTER DELIGHT · card tilt + magnetic CTAs (pointer:fine only)
   ============================================================ */
function setupPointerDelight() {
  if (!hasFinePointer()) return;

  // 3D tilt on marketing cards. The lift itself lives in CSS on
  // the `translate` property, so the inline `transform` written
  // here composes with it instead of overwriting the hover state.
  const tiltTargets = $$(".problem-card, .feature-strip > article, .price-card, .cta-metrics > div");
  tiltTargets.forEach((card) => {
    card.setAttribute("data-tilt", "");
    let frame = null;

    card.addEventListener("pointermove", (event) => {
      if (prefersReducedMotion()) return;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const rect = card.getBoundingClientRect();
        const dx = (event.clientX - rect.left) / rect.width - 0.5;
        const dy = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform =
          `perspective(900px) rotateX(${(-dy * 4).toFixed(2)}deg) ` +
          `rotateY(${(dx * 5).toFixed(2)}deg)`;
      });
    });

    card.addEventListener("pointerleave", () => {
      if (frame) cancelAnimationFrame(frame);
      frame = null;
      card.style.transform = "";
    });
  });

  // Magnetic pull on primary CTAs. Written to the `translate`
  // property so the CSS :hover transform lift still applies.
  $$(".primary-action, .nav-cta").forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      if (prefersReducedMotion()) return;
      const rect = button.getBoundingClientRect();
      const dx = clamp(event.clientX - rect.left - rect.width / 2, -60, 60) * 0.08;
      const dy = clamp(event.clientY - rect.top - rect.height / 2, -30, 30) * 0.14;
      button.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
    });
    button.addEventListener("pointerleave", () => {
      button.style.translate = "";
    });
  });
}

/* ============================================================
   CURSOR SPOTLIGHT · glass that notices the pointer
   ============================================================ */
function setupCardGlow() {
  if (!hasFinePointer()) return;

  const targets = $$(
    [
      ".problem-card",
      ".feature-strip > article",
      ".price-card",
      ".cta-metrics > div",
      ".trust-dashboard",
      ".risk-reasons",
      ".architecture-card",
      ".market-map",
      ".scale-copy",
      ".auth-card",
      ".onboarding-card",
      ".profile-side",
      ".private-side",
      ".candidate-card",
      ".score-console",
      ".moderation-console",
      ".safe-setup"
    ].join(", ")
  );

  targets.forEach((card) => {
    card.classList.add("has-glow");
    const glow = document.createElement("i");
    glow.className = "card-glow";
    glow.setAttribute("aria-hidden", "true");
    card.appendChild(glow);

    let frame = null;
    card.addEventListener("pointermove", (event) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const rect = card.getBoundingClientRect();
        glow.style.setProperty("--mx", `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
        glow.style.setProperty("--my", `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
      });
    });
  });
}

/* ============================================================
   BOOT
   ============================================================ */
const MODULES = [
  setupScrollProgress,
  setupScrollSpy,
  setupMobileNav,
  setupScrollButtons,
  setupReveal,
  setupCounters,
  setupAuthModal,
  setupAuthTabs,
  setupDemoRail,
  setupIntentPicker,
  setupIdentityReveal,
  setupMatching,
  setupChat,
  setupTrustAnimation,
  setupSafeDate,
  setupPricing,
  setupPointerDelight,
  setupCardGlow
];

document.addEventListener("DOMContentLoaded", () => {
  MODULES.forEach((module) => {
    try {
      module();
    } catch (error) {
      // One broken module must never take down the whole demo.
      console.error(`[elyra] ${module.name} failed:`, error);
    }
  });
});
