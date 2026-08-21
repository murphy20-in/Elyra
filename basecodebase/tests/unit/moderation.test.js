import { describe, it, expect } from "vitest";
import { checkMessage } from "../../src/utils/moderation.js";

describe("checkMessage", () => {
  it("passes ordinary conversation", () => {
    for (const text of [
      "Hey! How was your week?",
      "I loved that film. Want to get coffee sometime?",
      "I'm queer and out to my friends but not my family.",
      "Do you like Carnatic music?",
    ]) {
      expect(checkMessage(text).flagged, text).toBe(false);
    }
  });

  it("does not flag ordinary identity vocabulary", () => {
    // A filter that trips on these words would be worse than none at all
    for (const text of [
      "I'm a trans woman.", "He/him, gay, and terrible at chess.",
      "I'm bisexual and still figuring things out.",
    ]) {
      expect(checkMessage(text).flagged, text).toBe(false);
    }
  });

  it("flags threats as high severity", () => {
    const result = checkMessage("i will find you");
    expect(result.flagged).toBe(true);
    expect(result.category).toBe("threat");
    expect(result.severity).toBe("high");
  });

  it("flags threats to out someone", () => {
    const result = checkMessage("I'll tell your parents about you");
    expect(result.flagged).toBe(true);
    expect(result.severity).toBe("high");
  });

  it("flags scam patterns", () => {
    expect(checkMessage("share the otp with me").category).toBe("scam");
    expect(checkMessage("please send me 5000 rupees").flagged).toBe(true);
  });

  it("flags shared contact details as low severity", () => {
    const result = checkMessage("my number is +91 98765 43210");
    expect(result.flagged).toBe(true);
    expect(result.severity).toBe("low");
  });

  it("reports the highest severity when several rules hit", () => {
    const result = checkMessage("send me your otp or i will find you");
    expect(result.severity).toBe("high");
  });

  it("treats blank input as clean", () => {
    expect(checkMessage("").flagged).toBe(false);
    expect(checkMessage("   ").flagged).toBe(false);
    expect(checkMessage(null).flagged).toBe(false);
  });
});
