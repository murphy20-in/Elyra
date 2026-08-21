/**
 * Application entry point.
 *
 * Boot order matters: styles and shell first so there is something to
 * paint into, then the service worker and install listeners, then the
 * router. Data loading happens per-route rather than up front, so the
 * first paint isn't waiting on IndexedDB.
 */

import "./styles/index.css";

import { route, setNotFound, setGuard, startRouter, navigate, refresh } from "./app/router.js";
import { renderShell, outlet } from "./app/shell.js";
import { initServiceWorker, initInstallPrompt, installDismissed, canInstall, promptInstall, dismissInstall, isStandalone } from "./app/pwa.js";
import { getState, setState, watchConnectivity, subscribe } from "./store/store.js";
import { focusMain, html, raw } from "./utils/dom.js";
import { icon } from "./components/icons.js";
import { toast } from "./components/toast.js";
import { emptyState } from "./components/states.js";

import { resolveAppState, APP_STATES } from "./services/auth.service.js";
import { getProfile } from "./services/profile.service.js";
import { ensureSeeded } from "./services/discovery.service.js";

import { renderOnboarding } from "./pages/onboarding.js";
import { renderDiscover } from "./pages/discover.js";
import { renderMatches, renderMatchDetail } from "./pages/matches.js";
import { renderChats, renderChatThread, teardownChat, refreshUnreadCount } from "./pages/chats.js";
import { renderProfile, renderProfileEdit } from "./pages/profile.js";
import { renderPrivacy } from "./pages/privacy.js";
import { renderSafety, renderSafeDate, teardownSafeDate } from "./pages/safety.js";
import { renderSettings } from "./pages/settings.js";
import { renderPremium } from "./pages/premium.js";

/**
 * Routes that render without the app chrome. Onboarding owns the whole
 * viewport — a tab bar during setup invites people to skip steps that
 * matching depends on.
 */
const BARE_ROUTES = new Set(["/onboarding"]);

/** Runs before each render: tears down anything the last route started. */
function teardownPrevious() {
  teardownChat();
  teardownSafeDate();
}

function applyChrome(path) {
  document.body.dataset.chrome = BARE_ROUTES.has(path) ? "bare" : "app";
  // Publishes the resolved route on the document: a styling hook, and the
  // signal tests wait on instead of guessing from the URL.
  document.body.dataset.route = path;
  // Cleared on every navigation; pages needing a full-height layout
  // (the chat thread) set it again as they render.
  document.body.dataset.view = "";
}

/**
 * Monotonic render counter.
 *
 * Renderers are async — they await IndexedDB — so a fast navigation can
 * start a second render before the first finishes. The slower one then
 * writes its markup over the newer view. Comparing tokens tells us that
 * happened so we can repaint whatever route is actually current.
 */
let renderGeneration = 0;

/** Wraps a page renderer with teardown, chrome, focus and error handling. */
function page(renderer) {
  return async (params, query) => {
    const token = ++renderGeneration;

    teardownPrevious();
    applyChrome(window.location.hash.slice(1).split("?")[0] || "/");

    const root = outlet();
    if (!root) return;

    try {
      await renderer(root, params ?? {}, query);

      // A newer navigation landed while we were rendering, so what is on
      // screen now is ours, not theirs. Repaint the current route; this
      // converges as soon as navigation stops.
      if (token !== renderGeneration) {
        await refresh();
        return;
      }

      focusMain();
      root.scrollTop = 0;
    } catch (error) {
      console.error("Page render failed", error);
      root.innerHTML = emptyState({
        glyph: "alert",
        title: "Something went wrong",
        message: "That screen couldn't load. Your data is safe — try again.",
        action: { id: "reload", label: "Reload Elyra" },
      });
      root.querySelector('[data-state-action="reload"]')
        ?.addEventListener("click", () => window.location.reload());
    }
  };
}

function registerRoutes() {
  route("/", async () => {
    const state = await resolveAppState();
    navigate(state === APP_STATES.ACTIVE ? "/discover" : "/onboarding", { replace: true });
  });

  route("/onboarding", page(renderOnboarding));
  route("/discover", page(renderDiscover));
  route("/matches", page(renderMatches));
  route("/matches/:id", page(renderMatchDetail));
  route("/chats", page(renderChats));
  route("/chats/:id", page(renderChatThread));
  route("/profile", page(renderProfile));
  route("/profile/edit", page(renderProfileEdit));
  route("/privacy", page(renderPrivacy));
  route("/safety", page(renderSafety));
  route("/safety/safe-date", page(renderSafeDate));
  route("/settings", page(renderSettings));
  route("/premium", page(renderPremium));

  setNotFound(
    page(async (root, _params) => {
      // Deliberately does not re-run applyChrome: the wrapper has already
      // published the real (unmatched) path, and overwriting it here would
      // hide which link was broken.
      root.innerHTML = emptyState({
        glyph: "compass",
        title: "That page doesn't exist",
        message: "The link may be out of date. Everything else is where you left it.",
        action: { id: "home", label: "Back to Discover" },
      });
      root.querySelector('[data-state-action="home"]')
        ?.addEventListener("click", () => navigate("/discover"));
      void _params;
    })
  );

  /**
   * Anyone without a completed profile is sent to onboarding. Without
   * this, a bookmarked deep link would drop a first-time visitor into an
   * empty Discover with no explanation.
   */
  setGuard(async (path) => {
    if (path === "/onboarding" || path === "/") return null;
    const state = await resolveAppState();
    return state === APP_STATES.ACTIVE ? null : "/onboarding";
  });
}

/* ------------------------------------------------------------------ */
/* Install nudge                                                       */
/* ------------------------------------------------------------------ */

/**
 * Offered once, after the user has actually used the app. Prompting on
 * first paint asks someone to install software they haven't evaluated.
 * Dismissal is persisted so it never asks twice.
 */
function maybeOfferInstall() {
  if (installDismissed() || isStandalone()) return;

  const unsubscribe = subscribe(["installPrompt"], async (state) => {
    if (!canInstall(state)) return;
    unsubscribe();

    setTimeout(async () => {
      if (installDismissed()) return;
      const bar = document.createElement("div");
      bar.className = "install-bar";
      bar.innerHTML = html`
        <span class="install-copy">
          ${raw(icon("install"))}
          <span><strong>Install Elyra</strong><span>Add it to your home screen for a faster, app-like experience.</span></span>
        </span>
        <span class="install-actions">
          <button type="button" class="btn btn-small btn-secondary" data-install-later>Not now</button>
          <button type="button" class="btn btn-small btn-primary" data-install-go>Install</button>
        </span>`;
      document.body.append(bar);
      requestAnimationFrame(() => bar.classList.add("is-visible"));

      const close = () => {
        bar.classList.remove("is-visible");
        setTimeout(() => bar.remove(), 260);
      };

      bar.querySelector("[data-install-later]").addEventListener("click", () => {
        dismissInstall();
        close();
      });

      bar.querySelector("[data-install-go]").addEventListener("click", async () => {
        close();
        const result = await promptInstall(getState());
        if (result.ok) toast("Installing Elyra…");
      });
    }, 20_000);
  });
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function boot() {
  const root = document.getElementById("app");
  renderShell(root);

  watchConnectivity();
  initInstallPrompt();
  initServiceWorker();

  // Seed and profile load in parallel; neither blocks the first paint
  await Promise.all([
    ensureSeeded().catch((error) => console.error("Seeding failed", error)),
    getProfile()
      .then((profile) => setState({ profile }))
      .catch((error) => console.error("Profile load failed", error)),
  ]);

  refreshUnreadCount().catch(() => {});

  registerRoutes();
  await startRouter();

  maybeOfferInstall();
  document.body.classList.add("is-booted");
}

boot().catch((error) => {
  console.error("Elyra failed to start", error);
  const root = document.getElementById("app");
  if (root) {
    root.innerHTML =
      '<div class="boot-error"><h1>Elyra couldn\'t start</h1>' +
      "<p>Your browser may be blocking local storage. Try a normal (non-private) window.</p>" +
      '<button type="button" onclick="location.reload()">Reload</button></div>';
  }
});
