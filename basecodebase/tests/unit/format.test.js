import { describe, it, expect } from "vitest";
import { initials, distanceLabel, scoreBand, pct, dayLabel, relativeTime } from "../../src/utils/format.js";

describe("initials", () => {
  it("takes up to two initials", () => {
    expect(initials("Riya Sharma")).toBe("RS");
    expect(initials("Aarav")).toBe("A");
    expect(initials("Ana Maria Silva")).toBe("AM");
  });

  it("survives empty input", () => {
    expect(initials("")).toBe("?");
    expect(initials(null)).toBe("?");
  });
});

describe("distanceLabel", () => {
  it("buckets rather than exposing a precise distance", () => {
    // A precise figure on a dating profile is a trilateration primer
    expect(distanceLabel(1)).toBe("Very close by");
    expect(distanceLabel(8)).toBe("Nearby");
    expect(distanceLabel(200)).toBe("Far away");
    expect(distanceLabel(null)).toBe("Distance hidden");
  });

  it("never returns a number", () => {
    for (const km of [0, 1, 12, 60, 500]) {
      expect(distanceLabel(km)).not.toMatch(/\d/);
    }
  });
});

describe("scoreBand and pct", () => {
  it("bands scores", () => {
    expect(scoreBand(0.9)).toBe("Strong match");
    expect(scoreBand(0.65)).toBe("Good match");
    expect(scoreBand(0.2)).toBe("Low overlap");
  });

  it("renders a percentage", () => {
    expect(pct(0.846)).toBe("85%");
  });
});

describe("dayLabel and relativeTime", () => {
  it("labels today and yesterday", () => {
    expect(dayLabel(new Date().toISOString())).toBe("Today");
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    expect(dayLabel(yesterday)).toBe("Yesterday");
  });

  it("describes recent times loosely", () => {
    expect(relativeTime(new Date().toISOString())).toBe("just now");
    expect(relativeTime(new Date(Date.now() - 3 * 60_000).toISOString())).toBe("3m ago");
  });

  it("returns empty string for junk", () => {
    expect(relativeTime("not-a-date")).toBe("");
    expect(dayLabel("nope")).toBe("");
  });
});
