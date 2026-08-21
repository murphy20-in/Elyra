/**
 * Persistence tests, running against fake-indexeddb — a real
 * implementation of the IndexedDB spec, so transactions and indexes
 * behave as they do in the browser.
 */
import { describe, it, expect, beforeEach } from "vitest";
import adapter from "../../src/adapters/local.adapter.js";
import { dbDestroy } from "../../src/utils/db.js";

beforeEach(async () => {
  await dbDestroy();
  localStorage.clear();
});

describe("profile persistence", () => {
  it("returns null before anything is saved", async () => {
    expect(await adapter.profile.get()).toBeNull();
  });

  it("saves and reads back", async () => {
    await adapter.profile.save({ public: { displayName: "Riya", age: 27 } });
    const stored = await adapter.profile.get();
    expect(stored.public.displayName).toBe("Riya");
    expect(stored.id).toBe("me");
  });

  it("merges nested sections instead of clobbering them", async () => {
    await adapter.profile.save({ public: { displayName: "Riya", age: 27 } });
    await adapter.profile.save({ public: { city: "Bengaluru" } });
    const stored = await adapter.profile.get();
    expect(stored.public.displayName).toBe("Riya");
    expect(stored.public.city).toBe("Bengaluru");
  });

  it("stamps an updatedAt on every save", async () => {
    await adapter.profile.save({ public: { displayName: "A" } });
    const stored = await adapter.profile.get();
    expect(Date.parse(stored.updatedAt)).not.toBeNaN();
  });
});

describe("seeding", () => {
  it("populates the demo population once", async () => {
    const first = await adapter.candidates.seed();
    expect(first.length).toBeGreaterThan(10);
    const second = await adapter.candidates.seed();
    expect(second.length).toBe(first.length);
  });

  it("gives every candidate a stable unique id", async () => {
    const seeded = await adapter.candidates.seed();
    const ids = new Set(seeded.map((c) => c.id));
    expect(ids.size).toBe(seeded.length);
  });
});

describe("likes and matches", () => {
  it("records a like retrievable by target", async () => {
    await adapter.likes.add("cand_aarav", "like");
    const found = await adapter.likes.byTarget("cand_aarav");
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("like");
  });

  it("creates matches with distinct ids", async () => {
    const a = await adapter.matches.add("cand_a", 0.8);
    const b = await adapter.matches.add("cand_b", 0.7);
    expect(a.id).not.toBe(b.id);
    expect(await adapter.matches.list()).toHaveLength(2);
  });

  it("removes a match", async () => {
    const match = await adapter.matches.add("cand_a", 0.8);
    await adapter.matches.remove(match.id);
    expect(await adapter.matches.list()).toHaveLength(0);
  });
});

describe("conversations and messages", () => {
  it("stores messages against their conversation", async () => {
    const conversation = await adapter.conversations.add("match_1", "cand_a");
    await adapter.messages.add(conversation.id, { body: "hi", direction: "out" });
    await adapter.messages.add(conversation.id, { body: "hello", direction: "in" });
    await adapter.messages.add("other_conv", { body: "elsewhere", direction: "in" });

    const thread = await adapter.messages.byConversation(conversation.id);
    expect(thread).toHaveLength(2);
  });

  it("marks inbound messages read", async () => {
    const conversation = await adapter.conversations.add("match_1", "cand_a");
    await adapter.messages.add(conversation.id, { body: "hello", direction: "in" });
    const count = await adapter.messages.markConversationRead(conversation.id);
    expect(count).toBe(1);

    const [message] = await adapter.messages.byConversation(conversation.id);
    expect(message.readAt).not.toBeNull();
  });

  it("persists a draft", async () => {
    const conversation = await adapter.conversations.add("match_1", "cand_a");
    await adapter.conversations.update(conversation.id, { draft: "half a thought" });
    expect((await adapter.conversations.get(conversation.id)).draft).toBe("half a thought");
  });
});

describe("export and import", () => {
  it("round-trips a snapshot", async () => {
    await adapter.profile.save({ public: { displayName: "Riya" } });
    await adapter.matches.add("cand_a", 0.9);

    const snapshot = await adapter.data.exportAll();
    expect(snapshot.app).toBe("elyra");

    await adapter.data.deleteEverything();
    await adapter.data.importAll(snapshot);

    expect((await adapter.profile.get()).public.displayName).toBe("Riya");
    expect(await adapter.matches.list()).toHaveLength(1);
  });

  it("refuses a foreign file", async () => {
    await expect(adapter.data.importAll({ app: "something-else" })).rejects.toThrow(/Elyra export/);
  });

  it("refuses a snapshot from another schema version", async () => {
    await expect(
      adapter.data.importAll({ app: "elyra", schemaVersion: 999, stores: {} })
    ).rejects.toThrow(/different app version/);
  });
});

describe("destructive operations", () => {
  it("reset clears user data but restores the demo population", async () => {
    await adapter.profile.save({ public: { displayName: "Riya" } });
    await adapter.matches.add("cand_a", 0.9);

    await adapter.data.resetDemo();

    expect(await adapter.profile.get()).toBeNull();
    expect(await adapter.matches.list()).toHaveLength(0);
    expect((await adapter.candidates.list()).length).toBeGreaterThan(10);
  });

  it("delete removes everything, including our localStorage keys", async () => {
    localStorage.setItem("elyra:theme", '"dark"');
    localStorage.setItem("unrelated", "keep me");
    await adapter.profile.save({ public: { displayName: "Riya" } });

    await adapter.data.deleteEverything();

    expect(await adapter.profile.get()).toBeNull();
    expect(localStorage.getItem("elyra:theme")).toBeNull();
    // Other sites' keys are not ours to remove
    expect(localStorage.getItem("unrelated")).toBe("keep me");
  });
});

describe("safety records", () => {
  it("stores blocks and finds them by target", async () => {
    await adapter.blocks.add("cand_a", "harassment");
    expect(await adapter.blocks.byTarget("cand_a")).toHaveLength(1);
  });

  it("marks reports as local-only", async () => {
    const report = await adapter.reports.add({ targetId: "cand_a", reason: "scam" });
    expect(report.status).toBe("recorded-locally");
  });
});
