const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const toast = $("#demoToast");
let toastTimer;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3400);
}

function setupRevealMotion() {
  const revealItems = $$(".reveal");
  if (!revealItems.length) return;

  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((element) => element.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((element) => observer.observe(element));
}

function setupScrollButtons() {
  $$("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = $(button.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function setupDemoPanels() {
  const steps = $$(".rail-step");
  const panels = $$("[data-panel-view]");
  if (!steps.length || !panels.length) return;

  steps.forEach((step) => {
    step.setAttribute("aria-pressed", step.classList.contains("active") ? "true" : "false");
    step.addEventListener("click", () => {
      steps.forEach((item) => item.classList.remove("active"));
      steps.forEach((item) => item.setAttribute("aria-pressed", "false"));
      panels.forEach((panel) => panel.classList.remove("active"));
      step.classList.add("active");
      step.setAttribute("aria-pressed", "true");
      const activePanel = $(`[data-panel-view="${step.dataset.panel}"]`);
      if (activePanel) activePanel.classList.add("active");
      showToast(`${step.textContent.trim()} flow selected.`);
    });
  });
}

function setupIntentPicker() {
  const copy = {
    Exploring: "Discovery prioritizes gentle pacing, shared boundaries, and low-pressure introductions.",
    Serious: "Discovery prioritizes long-term alignment, preference fit, and verified profiles.",
    Discreet: "Privacy surfaces become prominent: anonymous chat, reveal pacing, and Safe Date prompts.",
    Friendship: "Discovery favors community, trust-building, and lower-stakes introductions."
  };

  $$("[data-intent-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      $$("[data-intent-choice]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const explain = $("#intentExplain");
      if (explain) {
        explain.innerHTML = `<strong>${button.dataset.intentChoice} selected</strong><span>${copy[button.dataset.intentChoice]}</span>`;
      }
      showToast(`${button.dataset.intentChoice} intent applied to the simulated onboarding state.`);
    });
  });
}

function setupIdentityUnlock() {
  const privateSide = $("#privateSide");
  const button = $("#unlockProfile");
  const audit = $("#revealAudit");
  if (!privateSide || !button || !audit) return;
  let unlocked = false;

  button.addEventListener("click", () => {
    unlocked = !unlocked;
    privateSide.classList.toggle("locked", !unlocked);
    privateSide.classList.toggle("unlocked", unlocked);
    button.textContent = unlocked ? "Revoke reveal" : "Animate reveal";
    audit.textContent = unlocked
      ? "Audit event written: private_profile.reveal · revocable access granted."
      : "Reveal revoked. Private fields return to encrypted display.";

    $$("[data-secret]", privateSide).forEach((field) => {
      field.textContent = unlocked ? field.dataset.secret : "Encrypted";
    });

    showToast(unlocked ? "Private identity layer revealed with consent." : "Private identity reveal revoked.");
  });
}

const candidates = [
  {
    avatar: "AR",
    name: "Aarav · 28",
    meta: "Bengaluru · he/they · discreet",
    score: "92%",
    bio: "Prefers verified, slow-paced connections and public first meetings.",
    reasons: ["Exact intent alignment", "High preference overlap", "Low risk, verified profile"],
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
  }
];

let candidateIndex = 0;

function setupMatchGeneration() {
  const card = $("#candidateCard");
  const bars = $$("[data-score-row] i");
  const button = $("#generateMatch");
  if (!card || !button) return;

  button.addEventListener("click", () => {
    candidateIndex = (candidateIndex + 1) % candidates.length;
    const next = candidates[candidateIndex];
    card.classList.remove("swap");
    void card.offsetWidth;
    card.classList.add("swap");

    $("#candidateAvatar").textContent = next.avatar;
    $("#candidateName").textContent = next.name;
    $("#candidateMeta").textContent = next.meta;
    $("#candidateScore").textContent = next.score;
    $("#candidateBio").textContent = next.bio;
    $("#reasonStack").replaceChildren(
      ...next.reasons.map((reason) => {
        const tag = document.createElement("span");
        tag.textContent = reason;
        return tag;
      })
    );
    bars.forEach((bar, index) => {
      bar.style.width = `${next.bars[index]}%`;
    });

    showToast(`Generated explainable match: ${next.name}.`);
  });
}

function createBubble(text, type, sensitive = false) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${type}${sensitive ? " blurred" : ""}`;

  if (sensitive) {
    const span = document.createElement("span");
    span.textContent = "Sensitive personal detail hidden by AI moderation.";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Reveal";
    button.addEventListener("click", () => {
      bubble.classList.add("unblurred");
      span.textContent = text;
      button.remove();
      showToast("Sensitive message revealed locally. Production would audit this action.");
    });
    bubble.append(span, button);
  } else {
    bubble.textContent = text;
  }

  return bubble;
}

function setupChatModeration() {
  const feed = $("#messageFeed");
  const input = $("#chatComposer");
  const decision = $("#moderationDecision");
  const trace = $("#moderationTrace");
  const personalDataScore = $("#personalDataScore");
  const action = $("#moderationAction");
  const sendButton = $("#sendDemoMessage");
  if (!feed || !input || !decision || !trace || !personalDataScore || !action || !sendButton) return;
  let replyTimer;

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    const sensitiveTerms = ["location", "phone", "address", "home", "number", "exact"];
    const sensitive = sensitiveTerms.some((term) => text.toLowerCase().includes(term));
    feed.appendChild(createBubble(text, "sent", sensitive));
    input.value = "";

    if (sensitive) {
      decision.textContent = "Sensitive personal-detail sharing detected. Message blurred until user confirms.";
      trace.textContent = "Category: personal_data · toxicity 0.08 · action: blur";
      personalDataScore.textContent = "0.78";
      action.textContent = "Blur";
      showToast("AI moderation blurred sensitive personal-detail content.");
    } else {
      decision.textContent = "No risk detected in the latest message.";
      trace.textContent = "Category: allow · toxicity 0.05 · action: deliver";
      personalDataScore.textContent = "0.10";
      action.textContent = "Allow";
      showToast("Message delivered in simulated chat.");
    }

    feed.scrollTop = feed.scrollHeight;
    clearTimeout(replyTimer);
    replyTimer = setTimeout(() => {
      feed.appendChild(
        createBubble("That boundary works. We can keep exact details inside Safe Date until both sides consent.", "received")
      );
      feed.scrollTop = feed.scrollHeight;
    }, 850);
  }

  sendButton.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendMessage();
  });

  $$("[data-unblur]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = $(button.dataset.unblur);
      if (!target) return;
      target.classList.add("unblurred");
      const label = $("span", target);
      if (label) label.textContent = "Potentially sensitive personal detail hidden by default.";
      button.remove();
      showToast("Blurred moderation sample revealed.");
    });
  });
}

function animateNumber(from, to, duration, onFrame) {
  const start = performance.now();
  function tick(now) {
    const elapsed = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    onFrame(Math.round(from + (to - from) * eased));
    if (elapsed < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function setupTrustAnimation() {
  const ring = $("#trustRing");
  const value = $("#trustValue");
  const summary = $("#trustSummary");
  const button = $("#animateTrust");
  const section = $(".safety-section");
  if (!ring || !value || !summary || !button || !section) return;
  let summaryTimer;
  let running = false;

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
      summary.textContent = "Score 91: verified profile, low chat toxicity, no reports, mature account signals.";
      running = false;
      showToast("Risk score recomputed with explainability visible.");
    }, 1180);
  }

  button.addEventListener("click", () => {
    running = false;
    run();
  });

  if (!("IntersectionObserver" in window)) {
    run();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        run();
        observer.disconnect();
      }
    },
    { threshold: 0.45 }
  );
  observer.observe(section);
}

function setupSafeDate() {
  const status = $("#safeStatus");
  const tracking = $("#safeTracking");
  const countdown = $("#safeCountdown");
  const pin = $("#userPin");
  const startButton = $("#startSafeSession");
  const checkInButton = $("#safeCheckIn");
  const sosButton = $("#safeSos");
  if (!status || !tracking || !countdown || !pin || !startButton || !checkInButton || !sosButton) return;
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
    pin.style.left = `${36 + Math.random() * 28}%`;
    pin.style.top = `${34 + Math.random() * 34}%`;
  }

  function startSession() {
    clearInterval(timerId);
    clearInterval(routeId);
    seconds = Math.min(intervalMinutes * 60, 95);
    status.textContent = "Safe Session active";
    tracking.textContent = "Live tracking on";
    pin.classList.add("active");
    renderTimer();
    movePin();

    timerId = setInterval(() => {
      seconds = Math.max(0, seconds - 1);
      renderTimer();
      if (seconds === 0) {
        clearInterval(timerId);
        status.textContent = "Check-in due";
        tracking.textContent = "Emergency contact queued";
        showToast("Check-in due. Production flow would create a missed-check-in safety event.");
      }
    }, 1000);

    routeId = setInterval(movePin, 2100);
    showToast("Safe Date session started with live location simulation.");
  }

  $$("[data-safe-interval]").forEach((button) => {
    button.addEventListener("click", () => {
      $$("[data-safe-interval]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      intervalMinutes = Number(button.dataset.safeInterval);
      showToast(`${intervalMinutes} minute Safe Date check-in selected.`);
    });
  });

  startButton.addEventListener("click", startSession);

  checkInButton.addEventListener("click", () => {
    if (seconds === 0) {
      startSession();
      return;
    }
    seconds = Math.min(intervalMinutes * 60, 95);
    status.textContent = "Checked in";
    tracking.textContent = "Live tracking on";
    renderTimer();
    showToast("Check-in recorded. Timer reset.");
  });

  sosButton.addEventListener("click", () => {
    clearInterval(timerId);
    status.textContent = "SOS triggered";
    tracking.textContent = "Emergency alert simulated";
    pin.classList.add("active");
    showToast("SOS simulated: emergency contact would receive location and alert metadata.");
  });
}

function setupPricing() {
  const priceMap = {
    monthly: { free: "₹0", plus: "₹499", premium: "₹999", elite: "₹1999" },
    yearly: { free: "₹0", plus: "₹4990", premium: "₹9990", elite: "₹19990" }
  };

  $$("[data-billing-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      $$("[data-billing-mode]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const prices = priceMap[button.dataset.billingMode];
      Object.entries(prices).forEach(([plan, price]) => {
        const priceNode = $(`[data-plan-price="${plan}"]`);
        if (priceNode) priceNode.textContent = price;
      });
      showToast(`${button.dataset.billingMode === "yearly" ? "Yearly" : "Monthly"} pricing displayed.`);
    });
  });

  $$("[data-upgrade-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      showToast(`${button.dataset.upgradePlan} upgrade prompt simulated. No payment request was sent.`);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupRevealMotion();
  setupScrollButtons();
  setupDemoPanels();
  setupIntentPicker();
  setupIdentityUnlock();
  setupMatchGeneration();
  setupChatModeration();
  setupTrustAnimation();
  setupSafeDate();
  setupPricing();
});
