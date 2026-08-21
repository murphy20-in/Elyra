/**
 * DOM helpers.
 *
 * `html` is an escaping tagged template: every interpolated value is
 * HTML-escaped unless explicitly wrapped in `raw()`. Templates are the
 * readable way to write this much markup in vanilla JS, and escaping by
 * default means profile text, bios and chat messages cannot inject markup.
 */

const RAW = Symbol("raw");

export const $ = (sel, scope = document) => scope.querySelector(sel);
export const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

export function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Marks a string as already-safe markup, exempting it from escaping. */
export const raw = (value) => ({ [RAW]: String(value ?? "") });

function serialize(value) {
  if (value === null || value === undefined || value === false) return "";
  if (Array.isArray(value)) return value.map(serialize).join("");
  if (typeof value === "object" && RAW in value) return value[RAW];
  return esc(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) {
    out += serialize(values[i]) + strings[i + 1];
  }
  return out;
}

export function render(container, markup) {
  container.innerHTML = markup;
  return container;
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of [].concat(children)) {
    if (child) node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Delegated listener — survives re-renders, cheaper than per-node binding. */
export function delegate(root, eventName, selector, handler) {
  root.addEventListener(eventName, (event) => {
    const match = event.target.closest?.(selector);
    if (match && root.contains(match)) handler(event, match);
  });
}

export const prefersReducedMotion = () =>
  globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

let hasRenderedOnce = false;

/**
 * Moves screen-reader and keyboard focus to a newly rendered view so a
 * route change is announced.
 *
 * Skipped on the first render: on initial load the user has not navigated
 * anywhere, and parking focus inside <main> would put their first Tab
 * press past the skip link.
 */
export function focusMain() {
  if (!hasRenderedOnce) {
    hasRenderedOnce = true;
    return;
  }
  const main = $("#appMain");
  if (!main) return;
  main.setAttribute("tabindex", "-1");
  main.focus({ preventScroll: true });
}
