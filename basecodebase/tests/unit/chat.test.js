import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { dbDestroy } from "../../src/utils/db.js";
import adapter from "../../src/adapters/local.adapter.js";
import {
  ensureConversation, sendMessage, getThread, markRead, cancelPendingReplies, inspect,
} from "../../src/services/chat.service.js";

beforeEach(async () => {
  await dbDestroy();
  localStorage.clear();
  await adapter.candidates.seed();
});

afterEach(() => cancelPendingReplies());

async function conversation() {
  const match = await adapter.matches.add("cand_aarav", 0.9);
  return ensureConversation(match.id);
}

describe("conversations", () => {
  it("creates one per match and reuses it", async () => {
    const match = await adapter.matches.add("cand_aarav", 0.9);
    const a = await ensureConversation(match.id);
    const b = await ensureConversation(match.id);
    expect(a.id).toBe(b.id);
    expect(await adapter.conversations.list()).toHaveLength(1);
  });

  it("refuses an unknown match", async () => {
    await expect(ensureConversation("match_nope")).rejects.toThrow(/no longer exists/);
  });
});

describe("sending", () => {
  it("stores an outbound message", async () => {
    const conv = await conversation();
    const result = await sendMessage(conv.id, "Hello there");
    expect(result.blocked).toBe(false);

    const thread = await getThread(conv.id);
    expect(thread.messages).toHaveLength(1);
    expect(thread.messages[0].direction).toBe("out");
  });

  it("rejects an empty or oversized message", async () => {
    const conv = await conversation();
    await expect(sendMessage(conv.id, "   ")).rejects.toThrow(/Write something/);
    await expect(sendMessage(conv.id, "x".repeat(2001))).rejects.toThrow(/too long/);
  });

  it("holds a flagged message until it is acknowledged", async () => {
    const conv = await conversation();
    const held = await sendMessage(conv.id, "send me your otp");
    expect(held.blocked).toBe(true);
    expect(held.warning.category).toBe("scam");
    expect((await getThread(conv.id)).messages).toHaveLength(0);
  });

  it("sends a flagged message once acknowledged, and records the flag", async () => {
    const conv = await conversation();
    await sendMessage(conv.id, "send me your otp");
    const sent = await sendMessage(conv.id, "send me your otp", { acknowledgedWarning: true });
    expect(sent.blocked).toBe(false);
    expect(sent.message.flagged.category).toBe("scam");
  });

  it("updates the conversation preview", async () => {
    const conv = await conversation();
    await sendMessage(conv.id, "Hello there");
    const updated = await adapter.conversations.get(conv.id);
    expect(updated.lastMessage.body).toBe("Hello there");
  });
});

describe("reading", () => {
  it("clears the unread count", async () => {
    const conv = await conversation();
    await adapter.messages.add(conv.id, { body: "hi", direction: "in" });
    await adapter.conversations.update(conv.id, { unread: 1 });

    await markRead(conv.id);
    expect((await adapter.conversations.get(conv.id)).unread).toBe(0);
  });
});

describe("inspect", () => {
  it("checks without sending", async () => {
    const conv = await conversation();
    expect(inspect("send me your otp").flagged).toBe(true);
    expect((await getThread(conv.id)).messages).toHaveLength(0);
  });
});
