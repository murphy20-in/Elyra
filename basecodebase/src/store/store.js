/**
 * Application state.
 *
 * A deliberately small observable object rather than a state library:
 * the app has one user and a handful of cross-cutting flags, and a
 * subscribe/notify pair covers it. Views read `state` and re-render on
 * the changes they care about.
 */

const state = {
  appState: "FIRST_VISIT",   // FIRST_VISIT | ONBOARDING | ACTIVE
  profile: null,
  online: navigator.onLine,
  route: null,
  unreadTotal: 0,
  activeSafeDate: null,
  installPrompt: null,
  updateReady: false,
};

const subscribers = new Map();

export function getState() {
  return state;
}

/**
 * @param {string[]|"*"} keys keys to react to, or "*" for every change
 */
export function subscribe(keys, handler) {
  const id = Symbol("subscriber");
  subscribers.set(id, { keys, handler });
  return () => subscribers.delete(id);
}

export function setState(patch) {
  const changed = [];
  for (const [key, value] of Object.entries(patch)) {
    if (state[key] === value) continue;
    state[key] = value;
    changed.push(key);
  }
  if (changed.length === 0) return state;

  subscribers.forEach(({ keys, handler }) => {
    if (keys === "*" || changed.some((key) => keys.includes(key))) {
      try {
        handler(state, changed);
      } catch (error) {
        console.error("Store subscriber failed", error);
      }
    }
  });

  return state;
}

/**
 * Reachability probe.
 *
 * `navigator.onLine === false` is trustworthy, but `true` is not: after a
 * reload served by the service worker, Chromium reports the page as online
 * even with the network down. An installed app reopened offline would
 * therefore show no offline banner. So we confirm a claimed-online state
 * with one small same-origin request.
 *
 * The cache-busting query matters — a precached URL would be answered by
 * the service worker and succeed offline, which is the false positive we
 * are trying to eliminate.
 */
async function probeNetwork() {
  try {
    await fetch(`./manifest.webmanifest?connectivity=${Date.now()}`, {
      method: "HEAD",
      cache: "no-store",
    });
    return true;
  } catch {
    return false;
  }
}

/** Network status drives the offline banner and is watched app-wide. */
export function watchConnectivity() {
  const applyOffline = () => setState({ online: false });

  const confirmOnline = async () => {
    if (!navigator.onLine) {
      applyOffline();
      return;
    }
    setState({ online: await probeNetwork() });
  };

  window.addEventListener("online", confirmOnline);
  window.addEventListener("offline", applyOffline);

  // Seed from the reliable negative immediately, then verify the positive
  if (!navigator.onLine) applyOffline();
  confirmOnline();
}
