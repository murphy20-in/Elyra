/**
 * Trust & safety.
 *
 * What is real in local mode: blocking (immediate and total within this
 * app), report records, safe-date sessions with real countdown timers,
 * trusted contacts, and the emergency action sheet.
 *
 * What is NOT real, and is labelled as such everywhere it appears:
 * reports are stored on this device and reach no moderation team, and
 * nothing here can send an SMS or place an emergency call on your behalf.
 * The emergency actions hand off to the device — `tel:` links, the Web
 * Share API — and say so when a handoff isn't available.
 */

import {
  blocks, reports, safeDates, trustedContacts, conversations, matches, activity,
} from "./storage.service.js";
import { nowIso, uid } from "../utils/id.js";

export const REPORT_REASONS = Object.freeze([
  { id: "harassment", label: "Harassment or bullying" },
  { id: "fake-profile", label: "Fake profile or catfishing" },
  { id: "scam", label: "Scam or asking for money" },
  { id: "hate", label: "Hate speech" },
  { id: "sexual", label: "Unwanted sexual content" },
  { id: "threats", label: "Threats or intimidation" },
  { id: "impersonation", label: "Impersonating someone" },
  { id: "underage", label: "They may be under 18" },
  { id: "other", label: "Something else" },
]);

/* ------------------------------------------------------------------ */
/* Blocking                                                            */
/* ------------------------------------------------------------------ */

export async function blockUser(targetId, reason = null) {
  const existing = await blocks.byTarget(targetId);
  if (existing.length > 0) return existing[0];

  const record = await blocks.add(targetId, reason);

  // A block must remove the connection, not just hide it
  const relatedMatches = await matches.byTarget(targetId);
  await Promise.all(
    relatedMatches.map(async (match) => {
      const related = await conversations.byMatch(match.id);
      await Promise.all(related.map((conversation) => conversations.remove(conversation.id)));
      await matches.remove(match.id);
    })
  );

  await activity.add("safety.blocked", { targetId });
  return record;
}

export async function unblockUser(blockId) {
  await blocks.remove(blockId);
  await activity.add("safety.unblocked", { blockId });
}

export const listBlocks = () => blocks.list();

export async function isBlocked(targetId) {
  const found = await blocks.byTarget(targetId);
  return found.length > 0;
}

/* ------------------------------------------------------------------ */
/* Reporting                                                           */
/* ------------------------------------------------------------------ */

export async function reportUser({ targetId, reason, detail = "", alsoBlock = true }) {
  if (!reason) throw new Error("Choose a reason so we know what happened.");

  const record = await reports.add({ targetId, reason, detail, alsoBlocked: alsoBlock });
  if (alsoBlock) await blockUser(targetId, `report:${reason}`);

  await activity.add("safety.reported", { targetId, reason });
  return record;
}

export const listReports = () => reports.list();

/* ------------------------------------------------------------------ */
/* Trusted contacts                                                    */
/* ------------------------------------------------------------------ */

export const listTrustedContacts = () => trustedContacts.list();
export const addTrustedContact = (contact) => trustedContacts.add(contact);
export const removeTrustedContact = (id) => trustedContacts.remove(id);

/* ------------------------------------------------------------------ */
/* Safe Date                                                           */
/* ------------------------------------------------------------------ */

export const CHECK_IN_OPTIONS = Object.freeze([
  { minutes: 30, label: "Every 30 minutes" },
  { minutes: 60, label: "Every hour" },
  { minutes: 120, label: "Every 2 hours" },
]);

export async function startSafeDate({ meetingWith, venue, startsAt, checkInMinutes, contactId }) {
  if (!venue) throw new Error("Add where you're meeting.");
  if (!contactId) throw new Error("Choose a trusted contact.");

  const active = await getActiveSafeDate();
  if (active) throw new Error("A Safe Date session is already running.");

  const started = startsAt || nowIso();
  const record = await safeDates.add({
    meetingWith: meetingWith ?? null,
    venue,
    contactId,
    checkInMinutes: Number(checkInMinutes) || 60,
    startedAt: started,
    nextCheckInAt: new Date(
      new Date(started).getTime() + (Number(checkInMinutes) || 60) * 60_000
    ).toISOString(),
    status: "active",
    checkIns: [],
  });

  await activity.add("safety.safe_date_started", { id: record.id });
  return record;
}

export async function getActiveSafeDate() {
  const all = await safeDates.list();
  return all.find((session) => session.status === "active") ?? null;
}

export async function checkIn(id) {
  const session = await safeDates.get(id);
  if (!session) throw new Error("That session has ended.");

  const entry = { id: uid("checkin"), at: nowIso(), state: "safe" };
  const next = await safeDates.update(id, {
    checkIns: [...(session.checkIns ?? []), entry],
    nextCheckInAt: new Date(Date.now() + session.checkInMinutes * 60_000).toISOString(),
    missedCheckIn: false,
  });

  await activity.add("safety.check_in", { id });
  return next;
}

export async function raiseAlert(id) {
  const next = await safeDates.update(id, { status: "alert", alertedAt: nowIso() });
  await activity.add("safety.alert_raised", { id });
  return next;
}

export async function endSafeDate(id) {
  const next = await safeDates.update(id, { status: "ended", endedAt: nowIso() });
  await activity.add("safety.safe_date_ended", { id });
  return next;
}

export const listSafeDates = () => safeDates.list();

/**
 * Emergency handoffs.
 *
 * The browser cannot dial or text on its own. These build the handoff and
 * report honestly when the platform can't complete it, so the UI can say
 * why instead of pretending an alert was sent.
 */
export const emergency = {
  /** `tel:` is honoured on phones; desktop browsers usually ignore it. */
  callNumber(number) {
    if (!number) return { ok: false, reason: "No number saved for that contact." };
    try {
      globalThis.location.href = `tel:${String(number).replace(/[^\d+]/g, "")}`;
      return { ok: true };
    } catch {
      return { ok: false, reason: "This device can't start a call from the browser." };
    }
  },

  /** Uses the Web Share sheet — the user still chooses the app and sends. */
  async shareStatus(text) {
    if (!navigator.share) {
      return { ok: false, reason: "Sharing isn't supported in this browser. Copy the message instead." };
    }
    try {
      await navigator.share({ title: "Elyra — Safe Date", text });
      return { ok: true };
    } catch (error) {
      if (error?.name === "AbortError") return { ok: false, reason: "Sharing cancelled." };
      return { ok: false, reason: "Couldn't open the share sheet." };
    }
  },

  /** One-shot position, only after the user taps. Never called silently. */
  getLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ ok: false, reason: "This browser has no location support." });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          ok: true,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
        (error) => resolve({
          ok: false,
          reason: error.code === 1
            ? "Location permission was denied."
            : "Couldn't get a location fix.",
        }),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
      );
    });
  },
};
