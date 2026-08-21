/**
 * Local matching engine.
 *
 * Mirrors the documented Elyra scoring model:
 *
 *   embedding similarity 35% · intent 30% · distance 20% · preference 15%
 *
 * IMPORTANT: in local mode the "similarity" term is a deterministic
 * interest-overlap approximation, NOT the production embedding model.
 * The browser is not running pgvector or a sentence encoder, and the UI
 * says so. The weighting and the shape of the result are kept identical
 * so `api.adapter` can swap in real server-side scores without the
 * Discover UI changing at all.
 *
 * Every function here is pure — no storage, no DOM — which is what makes
 * the scoring unit-testable.
 */

import { MATCH_WEIGHTS } from "../utils/config.js";

/**
 * How well two stated intents work together.
 * Asymmetry is deliberate: someone here for friendship being shown to
 * someone seeking a relationship is a worse experience for the person
 * seeking the relationship than the reverse.
 */
const INTENT_MATRIX = {
  serious: { serious: 1, exploring: 0.55, discreet: 0.3, friendship: 0.15 },
  exploring: { serious: 0.55, exploring: 1, discreet: 0.6, friendship: 0.45 },
  discreet: { serious: 0.3, exploring: 0.6, discreet: 1, friendship: 0.2 },
  friendship: { serious: 0.15, exploring: 0.45, discreet: 0.2, friendship: 1 },
};

export function intentScore(a, b) {
  if (!a || !b) return 0.5; // unknown intent shouldn't punish anyone
  return INTENT_MATRIX[a]?.[b] ?? 0.4;
}

/**
 * Jaccard overlap of interests, softened so that a single shared interest
 * still registers. Stands in for embedding cosine similarity.
 */
export function similarityScore(interestsA = [], interestsB = []) {
  const a = new Set(interestsA.map((i) => String(i).toLowerCase()));
  const b = new Set(interestsB.map((i) => String(i).toLowerCase()));
  if (a.size === 0 || b.size === 0) return 0.35;

  let shared = 0;
  for (const item of a) if (b.has(item)) shared += 1;

  const union = a.size + b.size - shared;
  const jaccard = union === 0 ? 0 : shared / union;

  // Blend toward a neutral baseline: zero overlap is not zero compatibility
  return Math.min(1, 0.25 + jaccard * 1.1);
}

/**
 * Smooth decay rather than hard cut-offs, so a good match slightly outside
 * a radius still surfaces instead of vanishing.
 */
export function distanceScore(km, maxKm = 100) {
  if (km === null || km === undefined) return 0.5;
  if (km <= 0) return 1;
  const ratio = km / Math.max(1, maxKm);
  return Math.max(0, Math.min(1, 1 / (1 + ratio * ratio)));
}

/** Age fit, orientation/gender openness, and stated distance limit. */
export function preferenceScore(user = {}, candidate = {}) {
  const prefs = user.preferences ?? {};
  let score = 0;
  let parts = 0;

  const minAge = Number(prefs.ageMin ?? 18);
  const maxAge = Number(prefs.ageMax ?? 99);
  const age = Number(candidate.age);
  if (Number.isFinite(age)) {
    parts += 1;
    if (age >= minAge && age <= maxAge) score += 1;
    else {
      // Just outside the band is a near miss, not a rejection
      const overshoot = age < minAge ? minAge - age : age - maxAge;
      score += Math.max(0, 1 - overshoot / 10);
    }
  }

  const wanted = prefs.genderIdentities ?? [];
  if (wanted.length > 0 && candidate.genderIdentity) {
    parts += 1;
    score += wanted.includes(candidate.genderIdentity) ? 1 : 0.2;
  }

  const maxDistance = Number(prefs.maxDistanceKm ?? 100);
  if (Number.isFinite(candidate.distanceKm)) {
    parts += 1;
    score += candidate.distanceKm <= maxDistance ? 1 : 0.35;
  }

  if (parts === 0) return 0.6;
  return score / parts;
}

/**
 * Full breakdown for one candidate. The UI renders these components
 * directly — the score is explained, never presented as a black box.
 */
export function scoreCandidate(user = {}, candidate = {}) {
  const components = {
    similarity: similarityScore(user.interests, candidate.interests),
    intent: intentScore(user.intent, candidate.intent),
    distance: distanceScore(candidate.distanceKm, user.preferences?.maxDistanceKm ?? 100),
    preference: preferenceScore(user, candidate),
  };

  const total =
    components.similarity * MATCH_WEIGHTS.similarity +
    components.intent * MATCH_WEIGHTS.intent +
    components.distance * MATCH_WEIGHTS.distance +
    components.preference * MATCH_WEIGHTS.preference;

  return {
    total: Math.max(0, Math.min(1, total)),
    components,
    weights: MATCH_WEIGHTS,
  };
}

/** Highest score first; ties break on ID so ordering is stable. */
export function rankCandidates(user, candidates = []) {
  return candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(user, candidate) }))
    .sort((a, b) => b.score.total - a.score.total || a.candidate.id.localeCompare(b.candidate.id));
}

/** Short human sentences describing why a match scored as it did. */
export function explainScore(user, candidate) {
  const { components } = scoreCandidate(user, candidate);
  const shared = (user.interests ?? []).filter((i) =>
    (candidate.interests ?? []).some((c) => c.toLowerCase() === String(i).toLowerCase())
  );

  const reasons = [];

  if (components.intent >= 0.9) reasons.push("You're both here for the same thing.");
  else if (components.intent >= 0.5) reasons.push("Your intentions are compatible.");
  else reasons.push("You're looking for different things.");

  if (shared.length >= 3) reasons.push(`You share ${shared.length} interests, including ${shared[0]}.`);
  else if (shared.length > 0) reasons.push(`You both like ${shared.join(" and ")}.`);
  else reasons.push("No shared interests listed yet.");

  if (components.distance >= 0.8) reasons.push("They're close by.");
  else if (components.distance >= 0.4) reasons.push("They're within reach.");
  else reasons.push("They're some distance away.");

  return reasons;
}
