/**
 * Local safety filter.
 *
 * This is a small deterministic pattern check that runs in the browser.
 * It is NOT the production moderation model — Elyra's real trust & safety
 * layer is a server-side service, and nothing here should be described to
 * a user as AI moderation. It exists so the safety *interaction* is real
 * in local mode: the warning, the choice, the ability to send anyway.
 *
 * Categories are intentionally narrow. A filter that over-triggers on
 * ordinary queer vocabulary would be worse than no filter at all, so the
 * patterns target directed abuse and solicitation, not identity terms.
 */

const RULES = [
  {
    category: "threat",
    severity: "high",
    message: "This reads as a threat. Threats are never allowed on Elyra.",
    patterns: [
      /\b(i(?:'m| am| will|'ll)?\s*(?:gonna|going to)?\s*(?:kill|hurt|beat|find)\s+you)\b/i,
      /\bwatch your back\b/i,
      /\byou(?:'re| are) dead\b/i,
    ],
  },
  {
    category: "harassment",
    severity: "high",
    message: "This may read as harassment or abuse.",
    patterns: [/\b(fuck|screw)\s+you\b/i, /\bshut up\b.*\b(bitch|slut|whore)\b/i, /\b(kill|hang) yourself\b/i],
  },
  {
    category: "outing",
    severity: "high",
    message: "This looks like a threat to out someone. That's a serious safety violation.",
    patterns: [
      /\b(tell|inform|call)\s+(your|his|her|their)\s+(family|parents|boss|work|office|colleagues)\b/i,
      /\bi(?:'ll| will)\s+expose you\b/i,
      /\beveryone will know (?:you|about you)\b/i,
    ],
  },
  {
    category: "scam",
    severity: "medium",
    message: "This looks like a common scam pattern. Never send money or codes.",
    patterns: [
      /\b(send|transfer|pay)\s+(me\s+)?(money|cash|rs\.?|₹|inr|\d+\s*(rupees|k))\b/i,
      /\b(otp|one[- ]time password|verification code)\b/i,
      /\b(gift card|bitcoin|crypto|usdt|upi id)\b/i,
      /\binvestment opportunity\b/i,
    ],
  },
  {
    category: "contact",
    severity: "low",
    message: "You're sharing contact details. Only do this with someone you trust.",
    patterns: [
      /\b\+?\d[\d\s-]{8,}\d\b/,
      /\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/i,
      /\b(whatsapp|telegram|snapchat|insta(?:gram)?)\s*(me|:|id|handle)?\b/i,
    ],
  },
  {
    category: "personal-detail",
    severity: "low",
    message: "This asks for details that can identify where you live or work.",
    patterns: [
      /\b(where do you (?:live|work)|what(?:'s| is) your (?:address|office|company|workplace))\b/i,
      /\bsend (?:me )?your (?:address|location|pin ?code)\b/i,
    ],
  },
];

const SEVERITY_RANK = { low: 1, medium: 2, high: 3 };

/**
 * @returns {{flagged: boolean, category?: string, severity?: string, message?: string}}
 */
export function checkMessage(text) {
  const value = String(text ?? "");
  if (!value.trim()) return { flagged: false };

  let worst = null;
  for (const rule of RULES) {
    if (!rule.patterns.some((pattern) => pattern.test(value))) continue;
    if (!worst || SEVERITY_RANK[rule.severity] > SEVERITY_RANK[worst.severity]) worst = rule;
  }

  if (!worst) return { flagged: false };

  return {
    flagged: true,
    category: worst.category,
    severity: worst.severity,
    message: worst.message,
  };
}

export const MODERATION_CATEGORIES = RULES.map((rule) => rule.category);
