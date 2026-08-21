/**
 * Single-slot toast. A second call replaces the first rather than
 * queueing — stacked transient messages are noise, not information.
 */

import { $ } from "./dom.js";

let el;
let timer;

export function toast(message, duration = 3200) {
  el = el || $("#toast");
  if (!el) return;

  el.textContent = message;
  el.classList.add("is-active");

  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove("is-active"), duration);
}
