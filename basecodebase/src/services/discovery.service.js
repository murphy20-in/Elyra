/**
 * Discovery — assembling the deck the user actually sees.
 *
 * Filters out anyone already acted on or blocked, ranks the remainder
 * with the matching engine, and decides whether a like becomes a match.
 */

import { candidates, likes, matches, blocks, activity } from "./storage.service.js";
import { rankCandidates, scoreCandidate, explainScore } from "./matching.service.js";
import { getProfile, toMatchingSubject } from "./profile.service.js";

export async function ensureSeeded() {
  return candidates.seed(false);
}

/**
 * The ranked deck. Anyone liked, passed, or blocked is excluded — the
 * deck is what's *left*, so it empties honestly rather than looping.
 */
export async function getDeck() {
  await ensureSeeded();

  const [profileRecord, allCandidates, allLikes, allBlocks] = await Promise.all([
    getProfile(), candidates.list(), likes.list(), blocks.list(),
  ]);

  const actedOn = new Set(allLikes.map((like) => like.targetId));
  const blocked = new Set(allBlocks.map((block) => block.targetId));

  const available = allCandidates.filter(
    (candidate) => !actedOn.has(candidate.id) && !blocked.has(candidate.id)
  );

  const subject = toMatchingSubject(profileRecord);
  return rankCandidates(subject, available).map(({ candidate, score }) => ({
    candidate,
    score,
    reasons: explainScore(subject, candidate),
  }));
}

export async function scoreFor(candidate) {
  const profileRecord = await getProfile();
  const subject = toMatchingSubject(profileRecord);
  return { score: scoreCandidate(subject, candidate), reasons: explainScore(subject, candidate) };
}

/**
 * Records a like and resolves whether it matched.
 *
 * Reciprocation is a fixed property of each demo profile, not a coin
 * flip — the same profile always behaves the same way, which is what
 * makes the flow testable.
 */
export async function likeCandidate(candidateId, kind = "like") {
  const candidate = await candidates.get(candidateId);
  if (!candidate) throw new Error("That profile is no longer available.");

  await likes.add(candidateId, kind);
  await activity.add("discover.like", { targetId: candidateId, kind });

  // A super like converts even a profile that would otherwise pass
  const reciprocated = candidate.reciprocates || kind === "superlike";
  if (!reciprocated) return { matched: false, candidate };

  const existing = await matches.byTarget(candidateId);
  if (existing.length > 0) return { matched: true, candidate, match: existing[0] };

  const { score } = await scoreFor(candidate);
  const match = await matches.add(candidateId, score.total);
  await activity.add("match.created", { targetId: candidateId });

  return { matched: true, candidate, match };
}

export async function passCandidate(candidateId) {
  await likes.add(candidateId, "pass");
  await activity.add("discover.pass", { targetId: candidateId });
  return { passed: true };
}

/** Matches joined to their candidate records, newest first. */
export async function listMatches() {
  const [allMatches, allCandidates, allBlocks] = await Promise.all([
    matches.list(), candidates.list(), blocks.list(),
  ]);

  const byId = new Map(allCandidates.map((candidate) => [candidate.id, candidate]));
  const blocked = new Set(allBlocks.map((block) => block.targetId));

  return allMatches
    .filter((match) => !blocked.has(match.targetId) && byId.has(match.targetId))
    .map((match) => ({ match, candidate: byId.get(match.targetId) }))
    .sort((a, b) => b.match.createdAt.localeCompare(a.match.createdAt));
}

export async function markMatchSeen(matchId) {
  return matches.update(matchId, { seen: true });
}
