/* ============================================================
   ELYRA · ULTIMATE INVESTOR POC
   All flows are local simulations · no backend
   ============================================================ */

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

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

/* ----- Smooth scroll ----- */
function setupScrollButtons() {
  $$("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetSelector = button.dataset.scroll;
      if (!targetSelector) return;
      const target = document.querySelector(targetSelector);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/* ----- Reveal on scroll ----- */
function setupReveal() {
  const items = $$(".reveal");
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );

  items.forEach((el) => io.observe(el));
}

/* ----- Hero counters ----- */
function setupCounters() {
  const counters = $$("[data-counter]");
  if (!counters.length) return;

  const animate = (el) => {
    const target = Number(el.dataset.counter);
    const suffix = el.dataset.suffix || "";
    const duration = 1400;
    const start = performance.now();

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${Math.round(target * eased)}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };

  if (!("IntersectionObserver" in window)) {
    counters.forEach(animate);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach((el) => io.observe(el));
}

/* ----- Auth modal ----- */
function setupAuthModal() {
  const modal = $("#authModal");
  if (!modal) return;

  $$("[data-open-auth]").forEach((button) =>
    button.addEventListener("click", () => {
      modal.classList.add("active");
      modal.setAttribute("aria-hidden", "false");
    })
  );

  $$("[data-close-modal]").forEach((button) =>
    button.addEventListener("click", () => {
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
    })
  );

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("active")) {
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
    }
  });
}

/* ----- Auth tabs (within onboarding panel) ----- */
function setupAuthTabs() {
  const tabs = $$("[data-auth-tab]");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      $$(".auth-form").forEach((form) => form.classList.remove("active"));
      const target = $(`#${tab.dataset.authTab}Form`);
      if (target) target.classList.add("active");
    });
  });
}

/* ----- Demo rail / panel switching ----- */
function activatePanel(name) {
  const steps = $$(".rail-step");
  const panels = $$("[data-panel-view]");
  steps.forEach((step) => {
    const isActive = step.dataset.panel === name;
    step.classList.toggle("active", isActive);
    step.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panelView === name));

  const order = ["onboarding", "identity", "matching", "chat", "safe"];
  const progress = $("#railProgress");
  if (progress) {
    const idx = Math.max(0, order.indexOf(name));
    progress.textContent = `${idx + 1} / 5`;
  }
}

function setupDemoRail() {
  const steps = $$(".rail-step");
  if (!steps.length) return;

  steps.forEach((step) => {
    step.setAttribute("aria-pressed", step.classList.contains("active") ? "true" : "false");
    step.addEventListener("click", () => {
      activatePanel(step.dataset.panel);
      const label = step.querySelector(".rail-label strong")?.textContent || "Step";
      toast(`${label} flow active.`);
    });
  });

  $$("[data-rail-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      activatePanel(button.dataset.railJump);
    });
  });
}

/* ----- Intent picker ----- */
function setupIntentPicker() {
  const explainCopy = {
    Exploring: "Discovery prioritizes gentle pacing, shared boundaries, and low-pressure introductions.",
    Serious: "Discovery prioritizes long-term alignment, preference fit, and verified profiles.",
    Discreet: "Privacy surfaces become prominent: anonymous chat, reveal pacing, and Safe Date prompts.",
    Friendship: "Discovery favors community, trust-building, and lower-stakes introductions."
  };

  $$("[data-intent]").forEach((button) => {
    button.addEventListener("click", () => {
      $$("[data-intent]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const intent = button.dataset.intent;
      const explain = $("#intentExplain");
      if (explain) {
        explain.innerHTML = `<strong>${intent} selected</strong><span>${explainCopy[intent]}</span>`;
      }
      toast(`${intent} intent applied to the simulated profile.`);
    });
  });
}

/* ----- Identity reveal ----- */
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

/* ----- Match generation (rotating candidates) ----- */
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
  const bars = $$("[data-score-row] i");
  if (!card) return;

  card.classList.remove("swap", "accepted", "passed");
  void card.offsetWidth;
  card.classList.add("swap");

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
      result.innerHTML =
        "<strong>Mutual match created.</strong> Chat thread provisioned · match.created event simulated.";
    }
    toast("Match simulated. Opening moderated chat.");
    setTimeout(() => activatePanel("chat"), 700);
  });

  pass.addEventListener("click", () => {
    card.classList.remove("accepted");
    card.classList.add("passed");
    if (result) {
      result.innerHTML =
        "<strong>Passed respectfully.</strong> Candidate removed from local queue · no swipe mechanics.";
    }
    toast("Candidate passed. The no-swipe queue stays intent-based.");
    setTimeout(() => {
      candidateIndex = (candidateIndex + 1) % candidates.length;
      renderCandidate(candidates[candidateIndex]);
    }, 600);
  });
}

/* ----- Chat with AI moderation ----- */
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

    feed.scrollTop = feed.scrollHeight;

    clearTimeout(replyTimer);
    replyTimer = setTimeout(() => {
      feed.appendChild(
        createBubble(
          "That boundary works. We can keep exact details inside Safe Date until both sides consent.",
          "received"
        )
      );
      feed.scrollTop = feed.scrollHeight;
    }, 900);
  }

  send.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendMessage();
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

/* ----- Trust score animation ----- */
function animateNumber(from, to, duration, onFrame) {
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    onFrame(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

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
    summary.textContent = "Recomputing report count, verification, toxicity history, account age, and fake-profile signals.";
    animateNumber(0, 91, 1100, (score) => {
      ring.style.setProperty("--trust", score);
      value.textContent = score;
    });
    summaryTimer = setTimeout(() => {
      summary.textContent = "Score 91 · verified profile · low chat toxicity · no upheld reports · mature account.";
      running = false;
      hasRun = true;
    }, 1180);
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
      if (entries.some((entry) => entry.isIntersecting) && !hasRun) {
        run();
      }
    },
    { threshold: 0.45 }
  );
  io.observe(section);
}

/* ----- Safe Date session ----- */
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
  }

  function movePin() {
    const left = 38 + Math.random() * 30;
    const top = 30 + Math.random() * 38;
    pin.style.left = `${left}%`;
    pin.style.top = `${top}%`;
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
    status.textContent = "SOS triggered";
    setTracking("Emergency alert simulated", "alert");
    pin.classList.remove("active");
    pin.classList.add("alert");
    toast("SOS simulated · contact + last known location dispatched.");
  });
}

/* ----- Pricing ----- */
function setupPricing() {
  const priceMap = {
    monthly: { free: "₹0", plus: "₹499", premium: "₹999", elite: "₹1999" },
    yearly:  { free: "₹0", plus: "₹4990", premium: "₹9990", elite: "₹19990" }
  };

  $$("[data-billing-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      $$("[data-billing-mode]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const mode = button.dataset.billingMode;
      const prices = priceMap[mode];
      Object.entries(prices).forEach(([plan, price]) => {
        const node = $(`[data-plan-price="${plan}"]`);
        if (node) node.textContent = price;
      });
      toast(`${mode === "yearly" ? "Yearly" : "Monthly"} pricing displayed.`);
    });
  });

  $$("[data-upgrade-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      toast(`${button.dataset.upgradePlan} upgrade prompt simulated · no payment request sent.`);
    });
  });
}

/* ----- Init ----- */
document.addEventListener("DOMContentLoaded", () => {
  setupReveal();
  setupCounters();
  setupScrollButtons();
  setupAuthModal();
  setupAuthTabs();
  setupDemoRail();
  setupIntentPicker();
  setupIdentityReveal();
  setupMatching();
  setupChat();
  setupTrustAnimation();
  setupSafeDate();
  setupPricing();
});
