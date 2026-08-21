/**
 * PWA integration: service worker lifecycle and install UX.
 *
 * Update handling is prompt-based rather than automatic. Silently
 * swapping the running app underneath someone mid-conversation is a
 * worse failure than showing a reload banner, so the SW waits and the
 * user decides.
 */

import { registerSW } from "virtual:pwa-register";
import { setState } from "../store/store.js";
import { LS_KEYS } from "../utils/config.js";

let updateSW = null;

export function initServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      setState({ updateReady: true });
    },
    onRegisterError(error) {
      console.error("Service worker registration failed", error);
    },
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-app-update]")) return;
    applyUpdate();
  });
}

export function applyUpdate() {
  setState({ updateReady: false });
  if (updateSW) updateSW(true);
  else window.location.reload();
}

/* ------------------------------------------------------------------ */
/* Install                                                             */
/* ------------------------------------------------------------------ */

export function initInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Keep the event so we can trigger the prompt from our own UI
    event.preventDefault();
    setState({ installPrompt: event });
  });

  window.addEventListener("appinstalled", () => {
    setState({ installPrompt: null });
    dismissInstall();
  });
}

export const canInstall = (state) => Boolean(state.installPrompt);

export const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

/** Safari has no beforeinstallprompt — it needs manual instructions. */
export function isIosSafari() {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

export async function promptInstall(state) {
  const event = state.installPrompt;
  if (!event) return { ok: false, reason: "unavailable" };

  event.prompt();
  const choice = await event.userChoice;
  setState({ installPrompt: null });

  if (choice.outcome !== "accepted") {
    dismissInstall();
    return { ok: false, reason: "dismissed" };
  }
  return { ok: true };
}

/** Dismissal persists, so the prompt doesn't reappear on every visit. */
export function dismissInstall() {
  try {
    localStorage.setItem(LS_KEYS.installDismissed, JSON.stringify(Date.now()));
  } catch { /* non-fatal */ }
}

export function installDismissed() {
  try {
    return Boolean(localStorage.getItem(LS_KEYS.installDismissed));
  } catch {
    return false;
  }
}
