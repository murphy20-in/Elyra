/**
 * DOM & environment helpers.
 *
 * The media queries are exposed as functions rather than captured
 * booleans so a user toggling their OS motion setting mid-session is
 * respected at call time, not at load time.
 */

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

export const prefersReducedMotion = () => reducedMotionQuery.matches;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const supportsObserver = () => "IntersectionObserver" in window;

/**
 * Attach a delegated listener. Cheaper than binding per-node and it
 * survives nodes added after page load.
 */
export function delegate(root, eventName, selector, handler) {
  root.addEventListener(eventName, (event) => {
    const match = event.target.closest(selector);
    if (match && root.contains(match)) handler(event, match);
  });
}
