/**
 * Profile domain logic — the dual-identity model.
 *
 * `public` is what other people can see. `private` is held back and
 * released only by an explicit reveal. In local mode both live in the
 * same IndexedDB database on this device; the separation is a product
 * boundary and a storage discipline, not encryption. The privacy pages
 * say exactly that rather than implying a cryptographic guarantee.
 */

import { profile as store, activity } from "./storage.service.js";
import { validatePublicProfile, isValid } from "../utils/validate.js";

export const DEFAULT_PRIVACY = Object.freeze({
  profileVisibility: "everyone",   // everyone | matches | nobody
  photoVisibility: "everyone",
  locationPrecision: "approximate", // off | approximate | precise
  showOnlineStatus: false,
  readReceipts: true,
  discoverable: true,
  anonymousMode: false,
  revealPrivateTo: [],             // match IDs granted a private-layer reveal
});

export const DEFAULT_PREFERENCES = Object.freeze({
  ageMin: 21,
  ageMax: 40,
  maxDistanceKm: 100,
  genderIdentities: [],
  intents: [],
});

export function emptyProfile() {
  return {
    public: {
      displayName: "",
      age: null,
      pronouns: "",
      genderIdentity: "",
      orientation: "",
      city: "",
      bio: "",
      interests: [],
      intent: "",
    },
    private: {
      fullName: "",
      email: "",
      phone: "",
      notes: "",
    },
    preferences: { ...DEFAULT_PREFERENCES },
    privacy: { ...DEFAULT_PRIVACY },
  };
}

export async function getProfile() {
  const stored = await store.get();
  if (!stored) return null;

  // Merge defaults forward so a profile written by an older build still
  // has every key the current UI expects.
  return {
    ...stored,
    public: { ...emptyProfile().public, ...stored.public },
    private: { ...emptyProfile().private, ...stored.private },
    preferences: { ...DEFAULT_PREFERENCES, ...stored.preferences },
    privacy: { ...DEFAULT_PRIVACY, ...stored.privacy },
  };
}

/** Shape the matching engine expects — flat, public fields only. */
export function toMatchingSubject(profileRecord) {
  if (!profileRecord) return {};
  return {
    ...profileRecord.public,
    interests: profileRecord.public?.interests ?? [],
    intent: profileRecord.public?.intent,
    preferences: profileRecord.preferences ?? DEFAULT_PREFERENCES,
  };
}

export async function savePublicProfile(publicPatch) {
  const errors = validatePublicProfile(publicPatch);
  if (!isValid(errors)) {
    const error = new Error("Some fields need attention.");
    error.fields = errors;
    throw error;
  }

  const saved = await store.save({ public: publicPatch });
  await activity.add("profile.updated", { section: "public" });
  return saved;
}

export async function savePrivateProfile(privatePatch) {
  const saved = await store.save({ private: privatePatch });
  await activity.add("profile.updated", { section: "private" });
  return saved;
}

export async function savePreferences(preferencesPatch) {
  const saved = await store.save({ preferences: preferencesPatch });
  await activity.add("preferences.updated");
  return saved;
}

export async function savePrivacy(privacyPatch) {
  const saved = await store.save({ privacy: privacyPatch });
  await activity.add("privacy.updated", { keys: Object.keys(privacyPatch) });
  return saved;
}

/** Clears the private layer only, leaving the public profile intact. */
export async function clearPrivateLayer() {
  const saved = await store.save({ private: emptyProfile().private });
  await activity.add("profile.private_cleared");
  return saved;
}

/** Rough completeness signal used by the profile page prompt. */
export function completeness(profileRecord) {
  if (!profileRecord) return 0;
  const p = profileRecord.public ?? {};
  const checks = [
    Boolean(p.displayName), Boolean(p.age), Boolean(p.city), Boolean(p.intent),
    Boolean(p.pronouns), Boolean(p.bio && p.bio.length > 20),
    Array.isArray(p.interests) && p.interests.length >= 3,
    Boolean(p.genderIdentity),
  ];
  return checks.filter(Boolean).length / checks.length;
}
