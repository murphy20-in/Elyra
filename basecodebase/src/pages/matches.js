/**
 * Matches — the people who liked back, and the entry point to chat.
 */

import { html, raw, esc } from "../utils/dom.js";
import { matchTile, compatibilityBreakdown } from "../components/profile-card.js";
import { emptyState, skeletonList } from "../components/states.js";
import { avatar } from "../components/avatar.js";
import { icon } from "../components/icons.js";
import { confirmDialog, openSheet } from "../components/dialog.js";
import { toastSuccess, toastError } from "../components/toast.js";
import { setTopbar } from "../app/shell.js";
import { navigate } from "../app/router.js";
import { listMatches, markMatchSeen, scoreFor } from "../services/discovery.service.js";
import { ensureConversation } from "../services/chat.service.js";
import { blockUser } from "../services/safety.service.js";
import { candidates, matches as matchStore } from "../services/storage.service.js";
import { relativeTime, distanceLabel } from "../utils/format.js";

export async function renderMatches(root) {
  setTopbar({ title: "Matches", subtitle: "People who liked you back" });
  root.innerHTML = `<div class="page">${skeletonList(3)}</div>`;

  const rows = await listMatches();

  if (rows.length === 0) {
    root.innerHTML = html`
      <div class="page">
        ${raw(emptyState({
          glyph: "heart",
          title: "No matches yet",
          message: "Keep exploring — when someone you like feels the same way, they'll show up here.",
          action: { id: "go-discover", label: "Open Discover" },
        }))}
      </div>`;
    root.querySelector('[data-state-action="go-discover"]')
      ?.addEventListener("click", () => navigate("/discover"));
    return;
  }

  const fresh = rows.filter((row) => !row.match.seen);

  root.innerHTML = html`
    <div class="page page-matches">
      ${raw(fresh.length ? `
        <section class="section-block">
          <h2 class="section-label">New ${fresh.length === 1 ? "match" : "matches"}</h2>
          <div class="match-strip">${fresh.map(matchTile).join("")}</div>
        </section>` : "")}

      <section class="section-block">
        <h2 class="section-label">All matches</h2>
        <ul class="row-list">
          ${raw(rows.map(({ match, candidate }) => `
            <li>
              <a class="row-item" href="#/matches/${esc(match.targetId)}">
                ${avatar({ name: candidate.displayName, seed: candidate.id, size: "md" })}
                <span class="row-copy">
                  <strong>${esc(candidate.displayName)}, ${esc(candidate.age)}</strong>
                  <span>${esc(candidate.city)} · matched ${esc(relativeTime(match.createdAt))}</span>
                </span>
                <span class="row-arrow">${icon("chevronRight")}</span>
              </a>
            </li>`).join(""))}
        </ul>
      </section>
    </div>`;
}

/** Detail view for one match. */
export async function renderMatchDetail(root, { id }) {
  setTopbar({ title: "Match", back: "/matches" });
  root.innerHTML = `<div class="page">${skeletonList(2)}</div>`;

  const candidate = await candidates.get(id);
  const related = await matchStore.byTarget(id);
  const match = related[0];

  if (!candidate || !match) {
    root.innerHTML = html`
      <div class="page">
        ${raw(emptyState({
          glyph: "alert",
          title: "That match isn't here",
          message: "It may have been removed, or the person blocked.",
          action: { id: "back", label: "Back to matches" },
        }))}
      </div>`;
    root.querySelector('[data-state-action="back"]')
      ?.addEventListener("click", () => navigate("/matches"));
    return;
  }

  if (!match.seen) await markMatchSeen(match.id);
  const { score, reasons } = await scoreFor(candidate);

  setTopbar({ title: candidate.displayName, back: "/matches" });

  root.innerHTML = html`
    <div class="page page-match-detail">
      <div class="panel profile-hero">
        ${raw(avatar({ name: candidate.displayName, seed: candidate.id, size: "xl" }))}
        <h2>${candidate.displayName} <span class="card-age">${candidate.age}</span></h2>
        <p class="card-sub">
          ${candidate.pronouns} · ${candidate.city}
          <span class="dot-sep">·</span> ${distanceLabel(candidate.distanceKm)}
        </p>
        ${raw(candidate.verified ? `<p class="pill pill-verified">${icon("shieldCheck")} Verified</p>` : "")}
        <p class="detail-bio">${candidate.bio}</p>
        <ul class="card-interests">
          ${raw(candidate.interests.map((i) => `<li class="tag">${esc(i)}</li>`).join(""))}
        </ul>
      </div>

      <div class="panel">
        <h3 class="section-label">Why you matched</h3>
        ${raw(compatibilityBreakdown(score))}
        <ul class="reason-list">${raw(reasons.map((r) => `<li>${esc(r)}</li>`).join(""))}</ul>
      </div>

      <div class="stack-actions">
        <button type="button" class="btn btn-primary btn-grow" data-open-chat>
          ${raw(icon("chat"))} Open chat
        </button>
        <button type="button" class="btn btn-secondary" data-unmatch>Unmatch</button>
        <button type="button" class="btn btn-secondary" data-block>Block</button>
      </div>
    </div>`;

  root.querySelector("[data-open-chat]")?.addEventListener("click", async () => {
    try {
      const conversation = await ensureConversation(match.id);
      navigate(`/chats/${conversation.id}`);
    } catch (error) {
      toastError(error.message);
    }
  });

  root.querySelector("[data-unmatch]")?.addEventListener("click", async () => {
    const ok = await confirmDialog({
      title: `Unmatch ${candidate.displayName}?`,
      message: "Your conversation is removed too. This can't be undone.",
      confirmLabel: "Unmatch",
      danger: true,
    });
    if (!ok) return;
    await matchStore.remove(match.id);
    toastSuccess("Unmatched.");
    navigate("/matches");
  });

  root.querySelector("[data-block]")?.addEventListener("click", async () => {
    const ok = await confirmDialog({
      title: `Block ${candidate.displayName}?`,
      message: "They're removed from your matches and chats immediately, and never told.",
      confirmLabel: "Block",
      danger: true,
    });
    if (!ok) return;
    await blockUser(candidate.id);
    toastSuccess(`${candidate.displayName} blocked.`);
    navigate("/matches");
  });

  root.querySelector("[data-breakdown]")?.addEventListener("click", () =>
    openSheet({ title: "Compatibility", body: compatibilityBreakdown(score) })
  );
}
