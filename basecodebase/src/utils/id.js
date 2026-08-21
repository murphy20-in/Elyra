/**
 * Identifier and clock helpers.
 *
 * IDs are stable and opaque; array position is never an identity. Times
 * are ISO-8601 strings so exported data stays readable and sortable.
 */

export function uid(prefix = "id") {
  const rand =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}

export const nowIso = () => new Date().toISOString();

/**
 * Deterministic 32-bit hash. Used wherever we need stable pseudo-randomness
 * keyed off an ID — avatar gradients, seeded reply timing — so the same
 * profile always looks and behaves the same way across reloads.
 */
export function hashString(value) {
  let h = 2166136261;
  const str = String(value);
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
