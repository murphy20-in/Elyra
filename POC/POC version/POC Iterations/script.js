const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const toast = $("#toast");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("active");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("active"), 3200);
}

function scrollToSection(id) {
  const target = document.querySelector(id);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupRevealAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  $$(".reveal").forEach((node) => observer.observe(node));
}

function setupAuthModal() {
  const modal = $("#authModal");
  const openButtons = $$("[data-open-auth]");
  const closeButtons = $$("[data-close-modal]");

  openButtons.forEach((button) => {
    button.addEventListener("click", () => {
      modal.classList.add("active");
      modal.setAttribute("aria-hidden", "false");
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
    });
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
    }
  });
}

function setupDemoShortcuts() {
  $$("[data-start-demo]").forEach((button) => {
    button.addEventListener("click", () => {
      $("#authModal").classList.remove("active");
      scrollToSection("#onboarding");
      showToast("Demo mode started. All interactions are frontend simulations.");
    });
  });

  $("[data-next-step]").addEventListener("click", () => {
    scrollToSection("#identity");
    showToast("Onboarding captured. Intent and profile state are simulated locally.");
  });

  $("[data-login-demo]").addEventListener("click", () => {
    scrollToSection("#matches");
    showToast("Logged into the prototype. No authentication request was sent.");
  });
}

function setupAuthTabs() {
  const tabs = $$("[data-auth-tab]");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      $$(".auth-form").forEach((form) => form.classList.remove("active"));
      $(`#${tab.dataset.authTab}Form`).classList.add("active");
    });
  });
}

function setupIntentSelection() {
  const note = $("#intentNote");
  const descriptions = {
    Exploring: "Discovery will prioritize people with similar pace and boundaries.",
    Serious: "Matching will prioritize long-term intent, preference fit, and verified profiles.",
    Discreet: "Privacy controls, anonymous chat, and private reveal pacing become prominent.",
    Friendship: "Discovery will prioritize community, low-pressure introductions, and shared context."
  };

  $$(".intent-option").forEach((option) => {
    option.addEventListener("click", () => {
      $$(".intent-option").forEach((item) => item.classList.remove("active"));
      option.classList.add("active");
      const intent = option.dataset.intent;
      note.innerHTML = `Selected: <strong>${intent}</strong>. ${descriptions[intent]}`;
      showToast(`${intent} intent selected for the simulated profile.`);
    });
  });
}

function setupPrivateReveal() {
  const button = $("#revealButton");
  const list = $("#secretList");
  const lockChip = $("#lockChip");
  const auditNote = $("#auditNote");
  let revealed = false;

  button.addEventListener("click", () => {
    revealed = !revealed;
    list.classList.toggle("locked", !revealed);
    lockChip.textContent = revealed ? "Revealed" : "Locked";
    lockChip.classList.toggle("unlocked", revealed);
    button.textContent = revealed ? "Revoke reveal access" : "Simulate reveal access";
    auditNote.textContent = revealed
      ? "Private fields decrypted for this viewer. Audit log: private_profile.reveal."
      : "Access revoked. Private fields are hidden again.";

    $$("[data-secret]", list).forEach((field) => {
      field.textContent = revealed ? field.dataset.secret : "Encrypted field";
    });

    showToast(revealed ? "Private profile reveal simulated." : "Private reveal revoked.");
  });
}

function setupMatching() {
  const card = $("[data-match-card]");
  const result = $("#matchResult");

  $("[data-like-match]").addEventListener("click", () => {
    card.classList.remove("passed");
    card.classList.add("accepted");
    result.innerHTML =
      "<strong>Mutual match created.</strong> Chat thread would be provisioned and match.created would notify both users.";
    showToast("Match simulated. Opening chat context.");
    setTimeout(() => scrollToSection("#chat"), 550);
  });

  $("[data-pass-match]").addEventListener("click", () => {
    card.classList.remove("accepted");
    card.classList.add("passed");
    result.innerHTML =
      "<strong>Passed respectfully.</strong> This candidate is removed from the local demo queue without swipe mechanics.";
    showToast("Candidate passed. The no-swipe queue stays intent-based.");
  });
}

function createMessage(text, type = "sent", options = {}) {
  const message = document.createElement("div");
  message.className = `message ${type}`;
  if (options.sensitive) message.classList.add("sensitive");

  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  message.appendChild(paragraph);

  if (options.sensitive) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "View anyway";
    button.addEventListener("click", () => {
      message.classList.add("unblurred");
      button.remove();
      showToast("Sensitive content unblurred locally. A real app would audit this action.");
    });
    message.appendChild(button);
  } else {
    const status = document.createElement("span");
    status.textContent = type === "sent" ? "Delivered" : "AI checked";
    message.appendChild(status);
  }

  return message;
}

function setupChat() {
  const messages = $("#messages");
  const input = $("#chatInput");
  const send = $("#sendMessage");

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    const sensitiveWords = ["phone", "address", "location", "home", "number"];
    const isSensitive = sensitiveWords.some((word) => text.toLowerCase().includes(word));

    messages.appendChild(createMessage(text, "sent", { sensitive: isSensitive }));
    input.value = "";
    messages.scrollTop = messages.scrollHeight;

    if (isSensitive) {
      showToast("AI moderation flagged sensitive detail sharing and blurred the message.");
    } else {
      showToast("Message delivered through simulated WebSocket flow.");
    }

    setTimeout(() => {
      messages.appendChild(
        createMessage(
          "That works for me. We can use Safe Date and keep exact details private until both sides consent.",
          "received"
        )
      );
      messages.scrollTop = messages.scrollHeight;
    }, 900);
  }

  send.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") sendMessage();
  });

  $$("[data-unblur-message]").forEach((button) => {
    button.addEventListener("click", () => {
      $("#sensitiveMessage").classList.add("unblurred");
      button.remove();
      showToast("Sensitive message revealed in prototype mode.");
    });
  });
}

function setupTrustRefresh() {
  $("[data-boost-trust]").addEventListener("click", () => {
    showToast("Risk score refreshed: low risk, verified, no upheld reports.");
  });
}

function setupSafeSession() {
  const startButton = $("#startSession");
  const checkInButton = $("#checkIn");
  const sosButton = $("#sosButton");
  const sessionStatus = $("#sessionStatus");
  const liveStatus = $("#liveStatus");
  const timer = $("#safeTimer");
  const pulse = $("#locationPulse");
  let intervalMinutes = 15;
  let secondsRemaining = 0;
  let sessionTimer;
  let mapTimer;

  $$(".intervals button").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".intervals button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      intervalMinutes = Number(button.dataset.interval);
      showToast(`${intervalMinutes} minute check-in interval selected.`);
    });
  });

  function renderTimer() {
    const minutes = String(Math.floor(secondsRemaining / 60)).padStart(2, "0");
    const seconds = String(secondsRemaining % 60).padStart(2, "0");
    timer.textContent = `${minutes}:${seconds}`;
  }

  function moveLocation() {
    const left = 34 + Math.random() * 32;
    const top = 32 + Math.random() * 34;
    pulse.style.left = `${left}%`;
    pulse.style.top = `${top}%`;
  }

  function startSession() {
    clearInterval(sessionTimer);
    clearInterval(mapTimer);
    secondsRemaining = Math.min(intervalMinutes * 60, 90);
    sessionStatus.textContent = "Active safe session";
    liveStatus.textContent = "Live tracking on";
    pulse.classList.add("active");
    renderTimer();
    moveLocation();

    sessionTimer = setInterval(() => {
      secondsRemaining = Math.max(0, secondsRemaining - 1);
      renderTimer();
      if (secondsRemaining === 0) {
        clearInterval(sessionTimer);
        sessionStatus.textContent = "Check-in due";
        showToast("Check-in due. A real app would notify the emergency workflow.");
      }
    }, 1000);

    mapTimer = setInterval(moveLocation, 2200);
    showToast("Safe Session started. Live tracking and check-in timer are simulated.");
  }

  startButton.addEventListener("click", startSession);

  checkInButton.addEventListener("click", () => {
    if (!secondsRemaining) {
      startSession();
      return;
    }
    secondsRemaining = Math.min(intervalMinutes * 60, 90);
    sessionStatus.textContent = "Checked in";
    renderTimer();
    showToast("Check-in recorded. Timer reset locally.");
  });

  sosButton.addEventListener("click", () => {
    sessionStatus.textContent = "SOS triggered";
    liveStatus.textContent = "Emergency alert simulated";
    showToast("SOS simulated: emergency contact would receive location and alert.");
  });
}

function setupPremium() {
  const monthly = {
    plus: "INR 499",
    premium: "INR 999",
    elite: "INR 1999"
  };
  const yearly = {
    plus: "INR 4990",
    premium: "INR 9990",
    elite: "INR 19990"
  };

  function setBilling(mode) {
    const prices = mode === "yearly" ? yearly : monthly;
    $("[data-price-plus]").textContent = prices.plus;
    $("[data-price-premium]").textContent = prices.premium;
    $("[data-price-elite]").textContent = prices.elite;
    showToast(`${mode === "yearly" ? "Yearly" : "Monthly"} pricing displayed.`);
  }

  $$("[data-billing]").forEach((button) => {
    button.addEventListener("click", () => {
      $$("[data-billing]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      setBilling(button.dataset.billing);
    });
  });

  $$("[data-upgrade]").forEach((button) => {
    button.addEventListener("click", () => {
      showToast(`${button.dataset.upgrade} upgrade prompt simulated. No payment request was sent.`);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupRevealAnimations();
  setupAuthModal();
  setupDemoShortcuts();
  setupAuthTabs();
  setupIntentSelection();
  setupPrivateReveal();
  setupMatching();
  setupChat();
  setupTrustRefresh();
  setupSafeSession();
  setupPremium();
});
