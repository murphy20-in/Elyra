/**
 * The Discover card and its compatibility breakdown.
 *
 * Information hierarchy is deliberately shallow — name and age, then
 * intent, then a compatibility figure, then interests. Everything else
 * lives behind "View profile". A card carrying twenty facts communicates
 * none of them.
 */

import { esc, html, raw } from "../utils/dom.js";
import { avatar } from "./avatar.js";
import { icon } from "./icons.js";
import { distanceLabel, pct, scoreBand } from "../utils/format.js";
import { INTENTS } from "../utils/config.js";

const intentLabel = (id) => INTENTS.find((intent) => intent.id === id)?.label ?? "Not stated";

export function compatibilityBreakdown(score) {
  const rows = [
    { key: "intent", label: "Intent" },
    { key: "similarity", label: "Interests" },
    { key: "preference", label: "Preferences" },
    { key: "distance", label: "Distance" },
  ];

  return html`
    <div class="breakdown">
      <div class="breakdown-total">
        <strong>${pct(score.total)}</strong>
        <span>${scoreBand(score.total)}</span>
      </div>
      <ul class="breakdown-rows">
        ${raw(
          rows
            .map(
              (row) => `
          <li>
            <span class="breakdown-label">${esc(row.label)}</span>
            <span class="meter" role="img" aria-label="${esc(row.label)}: ${pct(score.components[row.key])}">
              <i style="width:${Math.round(score.components[row.key] * 100)}%"></i>
            </span>
            <span class="breakdown-value">${pct(score.components[row.key])}</span>
          </li>`
            )
            .join("")
        )}
      </ul>
      <p class="breakdown-note">
        Scored on this device from interests, intent, preferences and distance.
        Not the server-side model.
      </p>
    </div>`;
}

export function profileCard({ candidate, score, reasons = [] }, { index = 0 } = {}) {
  return html`
    <article class="swipe-card" data-candidate="${candidate.id}" data-index="${index}"
             aria-label="${candidate.displayName}, ${candidate.age}">
      <div class="swipe-decision" data-decision aria-hidden="true"></div>

      <div class="card-media">
        ${raw(avatar({ name: candidate.displayName, seed: candidate.id, size: "xl" }))}
        <div class="card-badges">
          ${raw(candidate.verified ? `<span class="pill pill-verified">${icon("shieldCheck")} Verified</span>` : "")}
          ${raw(candidate.intent === "discreet" ? `<span class="pill pill-private">${icon("lock")} Discreet</span>` : "")}
        </div>
      </div>

      <div class="card-body">
        <header class="card-head">
          <h2>${candidate.displayName} <span class="card-age">${candidate.age}</span></h2>
          <p class="card-sub">
            ${candidate.pronouns} · ${candidate.city}
            <span class="dot-sep">·</span> ${distanceLabel(candidate.distanceKm)}
          </p>
        </header>

        <div class="card-tags">
          <span class="tag tag-intent">${intentLabel(candidate.intent)}</span>
          <span class="tag tag-score" data-open-breakdown role="button" tabindex="0"
                aria-label="Compatibility ${pct(score.total)}. Show breakdown.">
            ${raw(icon("spark"))} ${pct(score.total)}
          </span>
        </div>

        <p class="card-bio">${candidate.bio}</p>

        <ul class="card-interests">
          ${raw(candidate.interests.map((i) => `<li class="tag">${esc(i)}</li>`).join(""))}
        </ul>

        ${raw(
          reasons.length
            ? `<p class="card-reason">${esc(reasons[0])}</p>`
            : ""
        )}
      </div>
    </article>`;
}

export function matchTile({ match, candidate }) {
  return html`
    <a class="match-tile ${match.seen ? "" : "is-new"}" href="#/matches/${match.targetId}"
       aria-label="Open ${candidate.displayName}">
      ${raw(avatar({ name: candidate.displayName, seed: candidate.id, size: "lg", ring: !match.seen }))}
      <strong>${candidate.displayName}</strong>
      <span>${candidate.city}</span>
      ${raw(match.seen ? "" : '<span class="new-flag">New</span>')}
    </a>`;
}
