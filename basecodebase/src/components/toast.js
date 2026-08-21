/**
 * Toast notifications.
 *
 * One slot: a newer message replaces an older one rather than stacking,
 * because a queue of transient banners is noise. Announced via aria-live
 * so screen readers hear the confirmation too.
 */

import { esc } from "../utils/dom.js";
import { icon } from "./icons.js";

let host;
let timer;

function ensureHost() {
  if (host?.isConnected) return host;
  host = document.getElementById("toastHost");
  if (!host) {
    host = document.createElement("div");
    host.id = "toastHost";
    host.className = "toast";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    document.body.append(host);
  }
  return host;
}

/**
 * @param {string} message
 * @param {{tone?: "info"|"success"|"warning"|"danger", duration?: number}} options
 */
export function toast(message, { tone = "info", duration = 3000 } = {}) {
  const node = ensureHost();
  const glyph = tone === "success" ? "check" : tone === "danger" ? "alert" : tone === "warning" ? "alert" : "sparkles";

  node.className = `toast is-active tone-${tone}`;
  node.innerHTML = `<span class="toast-icon">${icon(glyph)}</span><span>${esc(message)}</span>`;

  clearTimeout(timer);
  timer = setTimeout(() => node.classList.remove("is-active"), duration);
}

export const toastSuccess = (message) => toast(message, { tone: "success" });
export const toastError = (message) => toast(message, { tone: "danger", duration: 4200 });
export const toastWarning = (message) => toast(message, { tone: "warning", duration: 4000 });
