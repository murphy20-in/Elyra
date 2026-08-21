/**
 * Discover.
 *
 * A card deck with buttons and swipe gestures. Gestures are an
 * accelerator, never the only way through: every action has a real
 * button, the buttons are keyboard reachable, and the deck works with a
 * screen reader. Pointer Events cover mouse, touch and pen in one path.
 */

import { html, raw, $ } from "../utils/dom.js";
import { icon } from "../components/icons.js";
import { profileCard, compatibilityBreakdown } from "../components/profile-card.js";
import { emptyState, errorState, skeletonCard } from "../components/states.js";
import { openSheet, confirmDialog } from "../components/dialog.js";
import { toast, toastSuccess, toastError } from "../components/toast.js";
import { setTopbar } from "../app/shell.js";
import { navigate } from "../app/router.js";
import { getDeck, likeCandidate, passCandidate } from "../services/discovery.service.js";
import { blockUser, reportUser, REPORT_REASONS } from "../services/safety.service.js";
import { ensureConversation } from "../services/chat.service.js";
import { prefersReducedMotion, esc } from "../utils/dom.js";
import { distanceLabel, pct } from "../utils/format.js";

let deck = [];
let busy = false;

const SWIPE_THRESHOLD = 96;

/* ------------------------------------------------------------------ */
/* Match celebration                                                   */
/* ------------------------------------------------------------------ */

async function celebrate(candidate, match) {
  const choice = await openSheet({
    title: "It's a match!",
    dismissible: true,
    body: html`
      <div class="match-celebration">
        <div class="celebration-glow" aria-hidden="true"></div>
        <p class="celebration-line">You and <strong>${candidate.displayName}</strong> liked each other.</p>
        <p class="celebration-sub">Say something real — openers about their actual profile land best.</p>
      </div>`,
    actions: [
      { label: "Keep discovering", value: "later", class: "btn-secondary" },
      { label: "Send a message", value: "chat", class: "btn-primary" },
    ],
  });

  if (choice !== "chat") return;

  try {
    const conversation = await ensureConversation(match.id);
    navigate(`/chats/${conversation.id}`);
  } catch (error) {
    toastError(error.message);
  }
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

async function act(kind, root) {
  if (busy || deck.length === 0) return;
  busy = true;

  const top = deck[0];
  const card = $(".swipe-card", root);

  try {
    if (card && !prefersReducedMotion()) {
      card.classList.add(kind === "pass" ? "fly-left" : "fly-right");
      await new Promise((resolve) => setTimeout(resolve, 220));
    }

    if (kind === "pass") {
      await passCandidate(top.candidate.id);
    } else {
      const result = await likeCandidate(top.candidate.id, kind);
      if (result.matched) {
        deck = deck.slice(1);
        paint(root);
        busy = false;
        await celebrate(result.candidate, result.match);
        return;
      }
      toast(`Liked ${top.candidate.displayName}`);
    }

    deck = deck.slice(1);
    paint(root);
  } catch (error) {
    toastError(error.message || "That didn't work.");
  } finally {
    busy = false;
  }
}

async function openReport(candidate, root) {
  const choice = await openSheet({
    title: `Report ${candidate.displayName}`,
    body: html`
      <p class="dialog-text">What's happening? This is recorded on your device and also blocks them.</p>
      <div class="radio-list">
        ${raw(REPORT_REASONS.map((reason, i) => `
          <label class="radio-row">
            <input type="radio" name="reportReason" value="${esc(reason.id)}"${i === 0 ? " checked" : ""} />
            <span>${esc(reason.label)}</span>
          </label>`).join(""))}
      </div>
      <div class="field">
        <label for="reportDetail">Anything else? (optional)</label>
        <textarea id="reportDetail" rows="3" placeholder="Add context if it helps."></textarea>
      </div>
      <p class="dialog-note">
        Local mode: reports are stored on this device only and don't reach a
        moderation team. Blocking, however, takes effect immediately.
      </p>`,
    actions: [
      { label: "Cancel", value: null, class: "btn-secondary" },
      { label: "Report and block", value: "submit", class: "btn-danger" },
    ],
  });

  if (choice !== "submit") return;

  // Read before the dialog is torn down by the resolve above
  const reason = document.querySelector('input[name="reportReason"]:checked')?.value ?? "other";
  const detail = document.querySelector("#reportDetail")?.value ?? "";

  try {
    await reportUser({ targetId: candidate.id, reason, detail, alsoBlock: true });
    toastSuccess("Report saved and user blocked.");
    deck = deck.filter((entry) => entry.candidate.id !== candidate.id);
    paint(root);
  } catch (error) {
    toastError(error.message);
  }
}

async function openBlock(candidate, root) {
  const confirmed = await confirmDialog({
    title: `Block ${candidate.displayName}?`,
    message: "They'll disappear from Discover and any match or conversation with them is removed. They're never told.",
    confirmLabel: "Block",
    danger: true,
  });
  if (!confirmed) return;

  await blockUser(candidate.id);
  toastSuccess(`${candidate.displayName} blocked.`);
  deck = deck.filter((entry) => entry.candidate.id !== candidate.id);
  paint(root);
}

async function openDetail(entry) {
  const { candidate, score, reasons } = entry;
  await openSheet({
    title: candidate.displayName,
    body: html`
      <div class="detail-sheet">
        <p class="detail-sub">
          ${candidate.age} · ${candidate.pronouns} · ${candidate.city}
          <span class="dot-sep">·</span> ${distanceLabel(candidate.distanceKm)}
        </p>
        ${raw(candidate.verified ? `<p class="pill pill-verified">${icon("shieldCheck")} Verified profile</p>` : "")}
        <p class="detail-bio">${candidate.bio}</p>

        <h3 class="detail-heading">Interests</h3>
        <ul class="card-interests">
          ${raw(candidate.interests.map((i) => `<li class="tag">${esc(i)}</li>`).join(""))}
        </ul>

        <h3 class="detail-heading">Why you're seeing this</h3>
        ${raw(compatibilityBreakdown(score))}
        <ul class="reason-list">
          ${raw(reasons.map((r) => `<li>${esc(r)}</li>`).join(""))}
        </ul>
      </div>`,
    actions: [{ label: "Close", value: null, class: "btn-secondary" }],
  });
}

/* ------------------------------------------------------------------ */
/* Swipe                                                               */
/* ------------------------------------------------------------------ */

function attachSwipe(card, root) {
  if (!card) return;

  let startX = 0;
  let startY = 0;
  let dragging = false;
  let pointerId = null;
  const decision = card.querySelector("[data-decision]");

  const reset = () => {
    card.style.transform = "";
    card.style.transition = "";
    if (decision) {
      decision.textContent = "";
      decision.className = "swipe-decision";
    }
  };

  card.addEventListener("pointerdown", (event) => {
    // Let interactive children handle their own taps
    if (event.target.closest("button, a, [data-open-breakdown]")) return;
    dragging = true;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    card.style.transition = "none";
    card.setPointerCapture(pointerId);
  });

  card.addEventListener("pointermove", (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    // Vertical intent means the user is scrolling, not swiping
    if (Math.abs(dy) > Math.abs(dx) * 1.4 && Math.abs(dx) < 30) return;

    card.style.transform = `translate3d(${dx}px, ${dy * 0.18}px, 0) rotate(${dx * 0.045}deg)`;

    if (decision) {
      if (dx > 40) {
        decision.textContent = "LIKE";
        decision.className = "swipe-decision is-like";
      } else if (dx < -40) {
        decision.textContent = "PASS";
        decision.className = "swipe-decision is-pass";
      } else {
        decision.textContent = "";
        decision.className = "swipe-decision";
      }
    }
  });

  const end = (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    dragging = false;
    card.releasePointerCapture?.(pointerId);
    card.style.transition = "";

    const dx = event.clientX - startX;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      reset();
      act(dx > 0 ? "like" : "pass", root);
      return;
    }
    reset();
  };

  card.addEventListener("pointerup", end);
  card.addEventListener("pointercancel", () => {
    dragging = false;
    reset();
  });
}

/* ------------------------------------------------------------------ */
/* Paint                                                               */
/* ------------------------------------------------------------------ */

function paint(root) {
  if (deck.length === 0) {
    root.innerHTML = html`
      <div class="page page-discover">
        ${raw(emptyState({
          glyph: "compass",
          title: "You've seen everyone for now",
          message:
            "That's the whole local demo population. Reset the demo data in Settings to browse again, or widen your preferences.",
          action: { id: "go-settings", label: "Open settings" },
        }))}
      </div>`;

    root.querySelector('[data-state-action="go-settings"]')
      ?.addEventListener("click", () => navigate("/settings"));
    return;
  }

  const [top, next] = deck;

  root.innerHTML = html`
    <div class="page page-discover">
      <div class="deck" aria-live="polite">
        ${raw(next ? `<div class="deck-peek" aria-hidden="true">${profileCard(next, { index: 1 })}</div>` : "")}
        ${raw(profileCard(top, { index: 0 }))}
      </div>

      <div class="deck-actions">
        <button type="button" class="round-btn round-pass" data-act="pass" aria-label="Pass on ${esc(top.candidate.displayName)}">
          ${raw(icon("close"))}
        </button>
        <button type="button" class="round-btn round-super" data-act="superlike" aria-label="Super like ${esc(top.candidate.displayName)}">
          ${raw(icon("star"))}
        </button>
        <button type="button" class="round-btn round-like" data-act="like" aria-label="Like ${esc(top.candidate.displayName)}">
          ${raw(icon("heart"))}
        </button>
      </div>

      <div class="deck-secondary">
        <button type="button" class="btn btn-ghost btn-small" data-act="detail">View full profile</button>
        <button type="button" class="btn btn-ghost btn-small" data-act="block">Block</button>
        <button type="button" class="btn btn-ghost btn-small" data-act="report">Report</button>
      </div>

      <p class="deck-count">${deck.length} ${deck.length === 1 ? "profile" : "profiles"} left · ranked by compatibility</p>
    </div>`;

  const card = $(".deck > .swipe-card", root);
  attachSwipe(card, root);

  root.querySelectorAll("[data-act]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.act;
      if (action === "detail") openDetail(deck[0]);
      else if (action === "block") openBlock(deck[0].candidate, root);
      else if (action === "report") openReport(deck[0].candidate, root);
      else act(action, root);
    });
  });

  const breakdown = root.querySelector("[data-open-breakdown]");
  const openBreakdown = () => openDetail(deck[0]);
  breakdown?.addEventListener("click", openBreakdown);
  breakdown?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openBreakdown();
    }
  });
}

export async function renderDiscover(root) {
  setTopbar({
    title: "Discover",
    subtitle: "Ranked by intent, interests and distance",
  });

  root.innerHTML = `<div class="page page-discover"><div class="deck">${skeletonCard()}</div></div>`;

  try {
    deck = await getDeck();
    paint(root);
  } catch (error) {
    console.error(error);
    root.innerHTML = errorState({ message: "Couldn't load profiles from local storage." });
    root.querySelector('[data-state-action="retry"]')
      ?.addEventListener("click", () => renderDiscover(root));
  }
}

export const __testing = { SWIPE_THRESHOLD, pct };
