import { describe, it, expect } from "vitest";
import { validatePublicProfile, validateTrustedContact, isValid, MIN_AGE } from "../../src/utils/validate.js";

const valid = {
  displayName: "Riya", age: 27, city: "Bengaluru",
  intent: "serious", bio: "Short bio.", interests: ["Reading"],
};

describe("validatePublicProfile", () => {
  it("accepts a complete profile", () => {
    expect(isValid(validatePublicProfile(valid))).toBe(true);
  });

  it("requires a display name", () => {
    expect(validatePublicProfile({ ...valid, displayName: "  " })).toHaveProperty("displayName");
  });

  it("enforces the minimum age", () => {
    const errors = validatePublicProfile({ ...valid, age: MIN_AGE - 1 });
    expect(errors.age).toContain(String(MIN_AGE));
  });

  it("rejects a non-integer age", () => {
    expect(validatePublicProfile({ ...valid, age: 27.5 })).toHaveProperty("age");
  });

  it("requires city and intent", () => {
    expect(validatePublicProfile({ ...valid, city: "" })).toHaveProperty("city");
    expect(validatePublicProfile({ ...valid, intent: "" })).toHaveProperty("intent");
  });

  it("caps bio length and interest count", () => {
    expect(validatePublicProfile({ ...valid, bio: "x".repeat(501) })).toHaveProperty("bio");
    expect(
      validatePublicProfile({ ...valid, interests: Array.from({ length: 13 }, (_, i) => `i${i}`) })
    ).toHaveProperty("interests");
  });

  it("reports every problem at once, not just the first", () => {
    const errors = validatePublicProfile({});
    expect(Object.keys(errors).length).toBeGreaterThan(2);
  });
});

describe("validateTrustedContact", () => {
  it("accepts a plausible contact", () => {
    expect(isValid(validateTrustedContact({ name: "Asha", phone: "+91 98765 43210" }))).toBe(true);
  });

  it("requires both fields", () => {
    expect(validateTrustedContact({})).toHaveProperty("name");
    expect(validateTrustedContact({ name: "Asha" })).toHaveProperty("phone");
  });

  it("rejects obvious non-numbers", () => {
    expect(validateTrustedContact({ name: "Asha", phone: "call me" })).toHaveProperty("phone");
  });
});
