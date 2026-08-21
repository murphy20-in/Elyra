/**
 * Application shell — the chrome that persists across routes.
 *
 * Desktop gets a left sidebar; mobile gets a top bar and bottom tab bar.
 * Both are rendered once and updated in place, so route changes only
 * repaint the outlet.
 *
 * Bottom navigation is capped at four destinations. Safety is reachable
 * from the top bar and from Profile rather than becoming a fifth tab —
 * crowding the bar makes every target harder to hit.
 */

import { esc, html, raw, $ } from "../utils/dom.js";
import { icon } from "../components/icons.js";
import { getState, subscribe } from "../store/store.js";

export const NAV_ITEMS = [
  { path: "/discover", label: "Discover", glyph: "compass" },
  { path: "/matches", label: "Matches", glyph: "heart" },
  { path: "/chats", label: "Chats", glyph: "chat", badge: "unreadTotal" },
  { path: "/profile", label: "Profile", glyph: "user" },
];

const SIDEBAR_EXTRA = [
  { path: "/safety", label: "Safety", glyph: "shield" },
  { path: "/settings", label: "Settings", glyph: "settings" },
];

function navLink(item, { active }) {
  const state = getState();
  const count = item.badge ? state[item.badge] : 0;
  return html`
    <a class="nav-item ${active ? "is-active" : ""}" href="#${item.path}"
       ${raw(active ? 'aria-current="page"' : "")}>
      <span class="nav-glyph">${raw(icon(item.glyph))}</span>
      <span class="nav-label">${item.label}</span>
      ${raw(count > 0 ? `<span class="nav-badge" aria-label="${count} unread">${count > 9 ? "9+" : count}</span>` : "")}
    </a>`;
}

export function renderShell(root) {
  root.innerHTML = html`
    <a class="skip-link" href="#appMain">Skip to content</a>

    <div class="app-shell">
      <aside class="app-sidebar" aria-label="Primary">
        <a class="brand" href="#/discover">
          <span class="brand-sigil">E</span>
          <span class="brand-stack">
            <strong>Elyra</strong>
            <small>Pehchaan Layer</small>
          </span>
        </a>
        <nav class="sidebar-nav" id="sidebarNav" aria-label="Sections"></nav>
        <div class="sidebar-foot" id="sidebarFoot"></div>
      </aside>

      <div class="app-body">
        <header class="app-topbar">
          <div class="topbar-lead" id="topbarLead"></div>
          <div class="topbar-actions" id="topbarActions"></div>
        </header>

        <div class="app-banner" id="appBanner" hidden></div>

        <main class="app-main" id="appMain" tabindex="-1"></main>

        <nav class="app-tabbar" id="tabBar" aria-label="Primary"></nav>
      </div>
    </div>

    <div class="toast" id="toastHost" role="status" aria-live="polite"></div>`;

  paintNav();
  subscribe(["route", "unreadTotal"], paintNav);
  subscribe(["online", "updateReady"], paintBanner);
  paintBanner();
}

function paintNav() {
  const state = getState();
  const isActive = (path) => state.route === path || state.route?.startsWith(`${path}/`);

  const sidebar = $("#sidebarNav");
  if (sidebar) {
    sidebar.innerHTML =
      NAV_ITEMS.map((item) => navLink(item, { active: isActive(item.path) })).join("") +
      '<hr class="nav-divider">' +
      SIDEBAR_EXTRA.map((item) => navLink(item, { active: isActive(item.path) })).join("");
  }

  const tabbar = $("#tabBar");
  if (tabbar) {
    tabbar.innerHTML = NAV_ITEMS.map((item) =>
      navLink(item, { active: isActive(item.path) })
    ).join("");
  }
}

/**
 * One banner slot, priority-ordered: an available update outranks the
 * offline notice, because acting on it changes what the user is running.
 */
function paintBanner() {
  const banner = $("#appBanner");
  if (!banner) return;
  const state = getState();

  if (state.updateReady) {
    banner.hidden = false;
    banner.className = "app-banner tone-info";
    banner.innerHTML = html`
      <span>${raw(icon("refresh"))} A new version of Elyra is ready.</span>
      <button type="button" class="btn btn-small btn-primary" data-app-update>Reload</button>`;
    return;
  }

  if (!state.online) {
    banner.hidden = false;
    banner.className = "app-banner tone-warning";
    banner.innerHTML = html`
      <span>${raw(icon("wifiOff"))} You're offline. Your local Elyra data is still available.</span>`;
    return;
  }

  banner.hidden = true;
  banner.innerHTML = "";
}

/** Per-page top bar content. Pages call this as they render. */
export function setTopbar({ title, subtitle, back, actions = "" } = {}) {
  const lead = $("#topbarLead");
  const actionSlot = $("#topbarActions");
  if (!lead || !actionSlot) return;

  lead.innerHTML = html`
    ${raw(
      back
        ? `<a class="icon-btn" href="#${esc(back)}" aria-label="Back">${icon("chevronLeft")}</a>`
        : ""
    )}
    <div class="topbar-titles">
      <h1>${title}</h1>
      ${raw(subtitle ? `<p>${esc(subtitle)}</p>` : "")}
    </div>`;

  actionSlot.innerHTML = actions;
}

export const outlet = () => $("#appMain");
