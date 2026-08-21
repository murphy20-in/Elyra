/**
 * Local account lifecycle.
 *
 * There is no authentication here, and the UI never implies there is.
 * A static host has no secret to verify a password against, so inventing
 * a login screen would be theatre. What we have is a *local account*:
 * a profile stored in this browser, with a session flag marking
 * onboarding as complete.
 *
 * The method names and shapes match what a real auth service would expose
 * so `api.adapter` can implement register/login/refresh/logout without the
 * calling code changing.
 */

import { profile as profileStore, session, activity } from "./storage.service.js";
import { LS_KEYS } from "../utils/config.js";
import { nowIso } from "../utils/id.js";

export const APP_STATES = Object.freeze({
  FIRST_VISIT: "FIRST_VISIT",
  ONBOARDING: "ONBOARDING",
  ACTIVE: "ACTIVE",
});

export function getSession() {
  return session.get();
}

export const isSignedIn = () => Boolean(session.get()?.localAccountId);

/** Which of the three lifecycle states the app should boot into. */
export async function resolveAppState() {
  const current = session.get();
  if (current?.onboarded) return APP_STATES.ACTIVE;

  const stored = await profileStore.get();
  if (stored) return APP_STATES.ONBOARDING;

  return APP_STATES.FIRST_VISIT;
}

/** Creates the local account record. Called at the end of onboarding. */
export async function createLocalAccount() {
  const existing = session.get();
  if (existing?.localAccountId) return existing;

  const created = {
    localAccountId: `local_${Date.now().toString(36)}`,
    mode: "local",
    createdAt: nowIso(),
    onboarded: false,
  };
  session.set(created);
  return created;
}

export async function completeOnboarding() {
  const current = (await createLocalAccount()) ?? {};
  const next = { ...current, onboarded: true, onboardedAt: nowIso() };
  session.set(next);

  try {
    localStorage.removeItem(LS_KEYS.onboardingStep);
  } catch { /* non-fatal */ }

  await activity.add("onboarding.completed");
  return next;
}

/** Records how far through onboarding the user got, so it survives a reload. */
export function saveOnboardingProgress(step, draft) {
  try {
    localStorage.setItem(LS_KEYS.onboardingStep, JSON.stringify({ step, draft }));
  } catch { /* non-fatal */ }
}

export function readOnboardingProgress() {
  try {
    const raw = localStorage.getItem(LS_KEYS.onboardingStep);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Ends the local session but keeps the data. Distinct from "delete all
 * local data", which is in the settings page and is irreversible.
 */
export async function signOut() {
  session.clear();
  await activity.add("session.signed_out");
}
