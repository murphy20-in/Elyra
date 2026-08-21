/**
 * Avatars.
 *
 * Rendered from initials over a deterministic gradient rather than photos.
 * Reasons, in order: the demo population is fictional and shipping
 * photographs of people would be dishonest; generated marks work offline
 * with no requests; and there is nothing to break or lazy-load.
 *
 * When photo upload arrives, this is the single component to change.
 */

import { hashString } from "../utils/id.js";
import { initials } from "../utils/format.js";
import { esc } from "../utils/dom.js";

const PALETTES = [
  ["#43e2d0", "#4fc7dd"],
  ["#ff6f8e", "#ffc56e"],
  ["#8f8ae0", "#4fc7dd"],
  ["#ffc56e", "#ff6f8e"],
  ["#71e6a4", "#43e2d0"],
  ["#4fc7dd", "#8f8ae0"],
];

export function avatarGradient(seed) {
  return PALETTES[hashString(seed) % PALETTES.length];
}

/**
 * @param {{name: string, seed?: string, size?: "sm"|"md"|"lg"|"xl", ring?: boolean}} options
 */
export function avatar({ name, seed, size = "md", ring = false } = {}) {
  const key = seed || name || "elyra";
  const [from, to] = avatarGradient(key);
  return `<span class="avatar avatar-${size}${ring ? " avatar-ring" : ""}" aria-hidden="true"
    style="--av-from:${from};--av-to:${to}">${esc(initials(name))}</span>`;
}
