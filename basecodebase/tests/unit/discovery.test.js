import { describe, it, expect, beforeEach } from "vitest";
import { dbDestroy } from "../../src/utils/db.js";
import adapter from "../../src/adapters/local.adapter.js";
import { getDeck, likeCandidate, passCandidate, listMatches } from "../../src/services/discovery.service.js";
import { blockUser } from "../../src/services/safety.service.js";

beforeEach(async () => {
  await dbDestroy();
  localStorage.clear();
  // getDeck() seeds lazily, but the liking tests address candidates
  // directly, so seed up front.
  await adapter.candidates.seed();
  await adapter.profile.save({
    public: { displayName: "Riya", age: 27, city: "Bengaluru", intent: "serious", interests: ["Reading"] },
    preferences: { ageMin: 21, ageMax: 40, maxDistanceKm: 100, genderIdentities: [] },
  });
});

describe("deck", () => {
  it("seeds and ranks candidates", async () => {
    const deck = await getDeck();
    expect(deck.length).toBeGreaterThan(5);
    for (let i = 1; i < deck.length; i += 1) {
      expect(deck[i - 1].score.total).toBeGreaterThanOrEqual(deck[i].score.total);
    }
  });

  it("carries an explanation with every card", async () => {
    const [top] = await getDeck();
    expect(top.reasons.length).toBeGreaterThan(0);
    expect(top.score.components).toHaveProperty("intent");
  });

  it("excludes anyone already acted on", async () => {
    const before = await getDeck();
    const target = before[0].candidate.id;
    await passCandidate(target);
    const after = await getDeck();
    expect(after.map((e) => e.candidate.id)).not.toContain(target);
    expect(after).toHaveLength(before.length - 1);
  });

  it("excludes blocked people", async () => {
    const before = await getDeck();
    await blockUser(before[0].candidate.id);
    const after = await getDeck();
    expect(after.map((e) => e.candidate.id)).not.toContain(before[0].candidate.id);
  });

  it("empties rather than looping", async () => {
    let deck = await getDeck();
    const total = deck.length;
    for (const entry of deck) await passCandidate(entry.candidate.id);
    deck = await getDeck();
    expect(deck).toHaveLength(0);
    expect(total).toBeGreaterThan(0);
  });
});

describe("liking", () => {
  it("matches when the profile reciprocates", async () => {
    const result = await likeCandidate("cand_aarav");
    expect(result.matched).toBe(true);
    expect(await listMatches()).toHaveLength(1);
  });

  it("does not match when it doesn't", async () => {
    const result = await likeCandidate("cand_nikita");
    expect(result.matched).toBe(false);
    expect(await listMatches()).toHaveLength(0);
  });

  it("is deterministic across runs", async () => {
    const first = await likeCandidate("cand_aarav");
    await dbDestroy();
    await adapter.candidates.seed();
    const second = await likeCandidate("cand_aarav");
    expect(second.matched).toBe(first.matched);
  });

  it("a super like converts a non-reciprocating profile", async () => {
    const result = await likeCandidate("cand_nikita", "superlike");
    expect(result.matched).toBe(true);
  });

  it("rejects an unknown candidate", async () => {
    await expect(likeCandidate("cand_nobody")).rejects.toThrow(/no longer available/);
  });
});
