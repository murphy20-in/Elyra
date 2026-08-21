/**
 * Single source of configuration truth.
 *
 * Everything that might differ between the static GitHub Pages build and
 * a future backend-connected build is resolved here, once.
 */

/**
 * Where application data lives.
 *
 *   "local" — IndexedDB in this browser. The only mode a static host can
 *             honestly support, and the default.
 *   "api"   — a real Elyra backend. Selected at build time via
 *             VITE_DATA_MODE=api and VITE_API_BASE_URL=<url>.
 */
export const DATA_MODE = import.meta.env?.VITE_DATA_MODE || "local";

export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "";

export const IS_LOCAL_MODE = DATA_MODE === "local";

/** Bumping this invalidates persisted data whose shape has changed. */
export const SCHEMA_VERSION = 1;

export const APP_NAME = "Elyra";

/**
 * Matching weights, mirroring the documented Elyra model.
 * They must total 1 — asserted in the unit tests rather than assumed.
 */
export const MATCH_WEIGHTS = Object.freeze({
  similarity: 0.35,
  intent: 0.3,
  distance: 0.2,
  preference: 0.15,
});

export const INTENTS = Object.freeze([
  { id: "serious", label: "Something serious", blurb: "Looking for a relationship." },
  { id: "exploring", label: "Exploring", blurb: "Open to seeing where things go." },
  { id: "friendship", label: "Friendship", blurb: "Community and real friendships." },
  { id: "discreet", label: "Discreet", blurb: "Privacy matters most right now." },
]);

export const LOCATION_PRECISION = Object.freeze([
  { id: "off", label: "Location disabled", blurb: "No location is used or stored." },
  { id: "approximate", label: "Approximate", blurb: "Only your city is used." },
  { id: "precise", label: "Precise", blurb: "Uses your device location for distance." },
]);

/** localStorage keys — namespaced so "delete local data" can find them all. */
export const LS_PREFIX = "elyra:";
export const LS_KEYS = Object.freeze({
  theme: `${LS_PREFIX}theme`,
  installDismissed: `${LS_PREFIX}install-dismissed`,
  onboardingStep: `${LS_PREFIX}onboarding-step`,
  session: `${LS_PREFIX}session`,
  seeded: `${LS_PREFIX}seeded`,
});
