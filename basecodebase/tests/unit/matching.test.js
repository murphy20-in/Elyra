import { describe, it, expect } from "vitest";
import {
  scoreCandidate, rankCandidates, intentScore, similarityScore,
  distanceScore, preferenceScore, explainScore,
} from "../../src/services/matching.service.js";
import { MATCH_WEIGHTS } from "../../src/utils/config.js";

const user = {
  intent: "serious",
  interests: ["Reading", "Cycling", "Filter coffee"],
  preferences: { ageMin: 25, ageMax: 35, maxDistanceKm: 50, genderIdentities: ["Woman"] },
};

const candidate = (over = {}) => ({
  id: "cand_x", age: 29, intent: "serious", distanceKm: 10,
  genderIdentity: "Woman", interests: ["Reading", "Cycling"], ...over,
});

describe("match weights", () => {
  it("sum to exactly 1", () => {
    const total = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("match the documented Elyra model", () => {
    expect(MATCH_WEIGHTS).toEqual({
      similarity: 0.35, intent: 0.3, distance: 0.2, preference: 0.15,
    });
  });
});

describe("intentScore", () => {
  it("is highest for identical intent", () => {
    expect(intentScore("serious", "serious")).toBe(1);
  });

  it("ranks friendship poorly against serious", () => {
    expect(intentScore("serious", "friendship")).toBeLessThan(
      intentScore("serious", "exploring")
    );
  });

  it("does not punish an unstated intent", () => {
    expect(intentScore(undefined, "serious")).toBe(0.5);
  });
});

describe("similarityScore", () => {
  it("rewards overlap", () => {
    const shared = similarityScore(["a", "b", "c"], ["a", "b", "c"]);
    const none = similarityScore(["a", "b"], ["x", "y"]);
    expect(shared).toBeGreaterThan(none);
  });

  it("is case-insensitive", () => {
    expect(similarityScore(["Reading"], ["reading"])).toBe(similarityScore(["reading"], ["reading"]));
  });

  it("treats zero overlap as low, not zero", () => {
    const score = similarityScore(["a"], ["b"]);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.5);
  });

  it("never exceeds 1", () => {
    expect(similarityScore(["a"], ["a"])).toBeLessThanOrEqual(1);
  });
});

describe("distanceScore", () => {
  it("decays with distance", () => {
    expect(distanceScore(1)).toBeGreaterThan(distanceScore(50));
    expect(distanceScore(50)).toBeGreaterThan(distanceScore(300));
  });

  it("is 1 at zero distance and neutral when unknown", () => {
    expect(distanceScore(0)).toBe(1);
    expect(distanceScore(null)).toBe(0.5);
  });

  it("stays within bounds", () => {
    expect(distanceScore(100000)).toBeGreaterThanOrEqual(0);
    expect(distanceScore(0)).toBeLessThanOrEqual(1);
  });
});

describe("preferenceScore", () => {
  it("rewards a candidate inside every stated preference", () => {
    expect(preferenceScore(user, candidate())).toBe(1);
  });

  it("softly penalises just outside the age band", () => {
    const near = preferenceScore(user, candidate({ age: 37 }));
    const far = preferenceScore(user, candidate({ age: 60 }));
    expect(near).toBeGreaterThan(far);
    expect(near).toBeLessThan(1);
  });

  it("does not hard-filter an unwanted gender identity", () => {
    const score = preferenceScore(user, candidate({ genderIdentity: "Man" }));
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe("scoreCandidate", () => {
  it("stays within 0..1", () => {
    const { total } = scoreCandidate(user, candidate());
    expect(total).toBeGreaterThanOrEqual(0);
    expect(total).toBeLessThanOrEqual(1);
  });

  it("is the weighted sum of its components", () => {
    const { total, components } = scoreCandidate(user, candidate());
    const expected =
      components.similarity * MATCH_WEIGHTS.similarity +
      components.intent * MATCH_WEIGHTS.intent +
      components.distance * MATCH_WEIGHTS.distance +
      components.preference * MATCH_WEIGHTS.preference;
    expect(total).toBeCloseTo(expected, 10);
  });

  it("is deterministic", () => {
    const a = scoreCandidate(user, candidate());
    const b = scoreCandidate(user, candidate());
    expect(a.total).toBe(b.total);
  });

  it("scores an aligned candidate above a misaligned one", () => {
    const good = scoreCandidate(user, candidate()).total;
    const bad = scoreCandidate(
      user,
      candidate({ id: "cand_y", intent: "friendship", distanceKm: 400, age: 62, interests: ["Techno"] })
    ).total;
    expect(good).toBeGreaterThan(bad);
  });
});

describe("rankCandidates", () => {
  it("orders by descending score", () => {
    const ranked = rankCandidates(user, [
      candidate({ id: "cand_far", distanceKm: 400, intent: "friendship", interests: [] }),
      candidate({ id: "cand_near" }),
    ]);
    expect(ranked[0].candidate.id).toBe("cand_near");
  });

  it("breaks ties stably by id", () => {
    const a = candidate({ id: "cand_a" });
    const b = candidate({ id: "cand_b" });
    expect(rankCandidates(user, [b, a])[0].candidate.id).toBe("cand_a");
  });

  it("handles an empty pool", () => {
    expect(rankCandidates(user, [])).toEqual([]);
  });
});

describe("explainScore", () => {
  it("returns readable reasons naming a shared interest", () => {
    const reasons = explainScore(user, candidate());
    expect(reasons.length).toBeGreaterThanOrEqual(3);
    expect(reasons.join(" ")).toMatch(/Reading|interests/i);
  });
});
