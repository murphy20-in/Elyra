import { describe, it, expect, beforeEach } from "vitest";
import { dbDestroy } from "../../src/utils/db.js";
import adapter from "../../src/adapters/local.adapter.js";
import {
  blockUser, isBlocked, reportUser, startSafeDate, getActiveSafeDate,
  checkIn, endSafeDate, addTrustedContact,
} from "../../src/services/safety.service.js";

beforeEach(async () => {
  await dbDestroy();
  localStorage.clear();
});

describe("blocking", () => {
  it("removes the match and its conversation, not just the visibility", async () => {
    const match = await adapter.matches.add("cand_a", 0.8);
    await adapter.conversations.add(match.id, "cand_a");

    await blockUser("cand_a");

    expect(await isBlocked("cand_a")).toBe(true);
    expect(await adapter.matches.list()).toHaveLength(0);
    expect(await adapter.conversations.list()).toHaveLength(0);
  });

  it("is idempotent", async () => {
    await blockUser("cand_a");
    await blockUser("cand_a");
    expect(await adapter.blocks.list()).toHaveLength(1);
  });
});

describe("reporting", () => {
  it("requires a reason", async () => {
    await expect(reportUser({ targetId: "cand_a" })).rejects.toThrow(/reason/);
  });

  it("blocks alongside the report by default", async () => {
    await reportUser({ targetId: "cand_a", reason: "scam" });
    expect(await isBlocked("cand_a")).toBe(true);
  });

  it("can report without blocking", async () => {
    await reportUser({ targetId: "cand_a", reason: "scam", alsoBlock: false });
    expect(await isBlocked("cand_a")).toBe(false);
  });
});

describe("safe date", () => {
  const setup = async () => {
    const contact = await addTrustedContact({ name: "Asha", phone: "+919000000000" });
    return contact;
  };

  it("requires a venue and a trusted contact", async () => {
    const contact = await setup();
    await expect(startSafeDate({ venue: "", contactId: contact.id })).rejects.toThrow(/meeting/);
    await expect(startSafeDate({ venue: "Cafe", contactId: null })).rejects.toThrow(/contact/);
  });

  it("starts a session with a future check-in", async () => {
    const contact = await setup();
    const session = await startSafeDate({ venue: "Cafe", contactId: contact.id, checkInMinutes: 60 });
    expect(session.status).toBe("active");
    expect(new Date(session.nextCheckInAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("refuses a second concurrent session", async () => {
    const contact = await setup();
    await startSafeDate({ venue: "Cafe", contactId: contact.id, checkInMinutes: 60 });
    await expect(
      startSafeDate({ venue: "Bar", contactId: contact.id, checkInMinutes: 60 })
    ).rejects.toThrow(/already running/);
  });

  it("check-in records an entry and pushes the timer out", async () => {
    const contact = await setup();
    const session = await startSafeDate({ venue: "Cafe", contactId: contact.id, checkInMinutes: 30 });
    const updated = await checkIn(session.id);
    expect(updated.checkIns).toHaveLength(1);
    expect(new Date(updated.nextCheckInAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("ending clears the active session", async () => {
    const contact = await setup();
    const session = await startSafeDate({ venue: "Cafe", contactId: contact.id, checkInMinutes: 60 });
    await endSafeDate(session.id);
    expect(await getActiveSafeDate()).toBeNull();
  });
});
