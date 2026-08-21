/**
 * Hash-based client-side router.
 *
 * Hash routing is a deliberate choice for GitHub Pages. Under the History
 * API a refresh or a shared deep link asks the host for a path that does
 * not exist on disk, which needs a server rewrite GitHub Pages cannot do
 * — the usual workaround is a 404.html that bounces through a query
 * string, which mangles URLs and breaks the back button. With a hash,
 * every route resolves to index.html at whatever subpath the site is
 * served from, so deep links, refresh, and bookmarks all work with no
 * host cooperation and no configured repository name.
 */

import { setState } from "../store/store.js";

const routes = [];
let notFoundHandler = null;
let beforeEach = null;
let current = null;

/**
 * @param {string} pattern e.g. "/chat/:id"
 */
export function route(pattern, handler) {
  const names = [];
  // Escape regex metacharacters first, then swap `:name` segments for a
  // capture group. `/` is not in the escape set, so the second pass must
  // match a bare slash — not an escaped one.
  const escaped = pattern.replace(/\/$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const source = escaped.replace(/\/:(\w+)/g, (_match, name) => {
    names.push(name);
    return "/([^/]+)";
  });
  const regex = new RegExp(`^${source}/?$`);
  routes.push({ pattern, regex, names, handler });
}

export const setNotFound = (handler) => { notFoundHandler = handler; };

/** Guard run before every navigation; return a path string to redirect. */
export const setGuard = (guard) => { beforeEach = guard; };

export function currentPath() {
  const hash = window.location.hash || "#/";
  return hash.slice(1).split("?")[0] || "/";
}

export function currentQuery() {
  const hash = window.location.hash || "";
  const index = hash.indexOf("?");
  return index === -1
    ? new URLSearchParams()
    : new URLSearchParams(hash.slice(index + 1));
}

export function navigate(path, { replace = false } = {}) {
  const target = `#${path.startsWith("/") ? path : `/${path}`}`;
  if (window.location.hash === target) {
    resolve();
    return;
  }
  if (replace) {
    // replaceState does not fire hashchange, so the route would silently
    // never resolve. Drive it by hand.
    window.history.replaceState(null, "", target);
    resolve();
  } else {
    // Assigning the hash fires hashchange, which resolve() is bound to.
    window.location.hash = target;
  }
}

function match(path) {
  for (const entry of routes) {
    const found = path.match(entry.regex);
    if (!found) continue;
    const params = {};
    entry.names.forEach((name, index) => {
      params[name] = decodeURIComponent(found[index + 1]);
    });
    return { entry, params };
  }
  return null;
}

async function resolve() {
  const path = currentPath();

  if (beforeEach) {
    const redirect = await beforeEach(path);
    if (redirect && redirect !== path) {
      navigate(redirect, { replace: true });
      return;
    }
  }

  const found = match(path);
  current = path;
  setState({ route: path });

  try {
    if (found) await found.entry.handler(found.params, currentQuery());
    else if (notFoundHandler) await notFoundHandler(path);
  } catch (error) {
    console.error("Route failed", path, error);
    if (notFoundHandler) await notFoundHandler(path, error);
  }
}

export function startRouter() {
  window.addEventListener("hashchange", resolve);
  if (!window.location.hash) window.history.replaceState(null, "", "#/");
  return resolve();
}

export const getCurrent = () => current;

/** Re-runs the active route — used after data changes that alter a view. */
export const refresh = () => resolve();
