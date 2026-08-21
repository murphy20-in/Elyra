/** Empty, loading, and error states. Every list view uses these. */

import { esc } from "../utils/dom.js";
import { icon } from "./icons.js";

export function emptyState({ glyph = "sparkles", title, message, action } = {}) {
  return `
    <div class="state-block">
      <span class="state-glyph">${icon(glyph)}</span>
      <h3>${esc(title)}</h3>
      <p>${esc(message)}</p>
      ${action ? `<button type="button" class="btn btn-primary" data-state-action="${esc(action.id)}">${esc(action.label)}</button>` : ""}
    </div>`;
}

export function errorState({ title = "Something went wrong", message, retryId = "retry" } = {}) {
  return `
    <div class="state-block state-error">
      <span class="state-glyph">${icon("alert")}</span>
      <h3>${esc(title)}</h3>
      <p>${esc(message)}</p>
      <button type="button" class="btn btn-secondary" data-state-action="${esc(retryId)}">Try again</button>
    </div>`;
}

/** Skeletons mirror the real layout so nothing shifts when data lands. */
export const skeletonCard = () => `
  <div class="skeleton-card" aria-hidden="true">
    <div class="skeleton skeleton-media"></div>
    <div class="skeleton skeleton-line" style="width:60%"></div>
    <div class="skeleton skeleton-line" style="width:40%"></div>
  </div>`;

export const skeletonRow = () => `
  <div class="skeleton-row" aria-hidden="true">
    <div class="skeleton skeleton-avatar"></div>
    <div class="skeleton-row-lines">
      <div class="skeleton skeleton-line" style="width:45%"></div>
      <div class="skeleton skeleton-line" style="width:70%"></div>
    </div>
  </div>`;

export const skeletonList = (count = 4) =>
  `<div class="skeleton-stack">${Array.from({ length: count }, skeletonRow).join("")}</div>`;

export const loadingBlock = (label = "Loading") =>
  `<div class="state-block"><span class="spinner" aria-hidden="true"></span><p>${esc(label)}</p></div>`;
