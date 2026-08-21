/**
 * Local persistence adapter — IndexedDB.
 *
 * This is the adapter the static build uses. It implements the same
 * surface as `api.adapter.js`, so the services above it (and therefore
 * the whole UI) never learn which one is active.
 *
 * Honest scope: data written here lives in one browser profile on one
 * device. It is not synced, not shared between users, and not encrypted
 * at rest by us — the browser's own disk encryption is the only thing
 * protecting it. Nothing in the UI claims otherwise.
 */

import {
  dbAll, dbByIndex, dbClearAll, dbDelete, dbDestroy, dbGet, dbPut, dbPutMany, STORES,
} from "../utils/db.js";
import { LS_KEYS, LS_PREFIX, SCHEMA_VERSION } from "../utils/config.js";
import { nowIso, uid } from "../utils/id.js";
import { buildSeedCandidates } from "../data/seed.js";

export const MODE = "local";

/** The signed-in local user is always this single record. */
const ME = "me";

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

function readLs(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeLs(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be unavailable (private mode, quota). Non-fatal. */
  }
}

export const session = {
  get: () => readLs(LS_KEYS.session, null),
  set: (value) => writeLs(LS_KEYS.session, value),
  clear: () => {
    try {
      localStorage.removeItem(LS_KEYS.session);
    } catch { /* non-fatal */ }
  },
};

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export const profile = {
  async get() {
    return (await dbGet("profile", ME)) ?? null;
  },

  async save(patch) {
    const current = (await dbGet("profile", ME)) ?? {
      id: ME,
      schemaVersion: SCHEMA_VERSION,
      createdAt: nowIso(),
      public: {},
      private: {},
      preferences: {},
      privacy: {},
    };

    const next = {
      ...current,
      ...patch,
      id: ME,
      public: { ...current.public, ...(patch.public ?? {}) },
      private: { ...current.private, ...(patch.private ?? {}) },
      preferences: { ...current.preferences, ...(patch.preferences ?? {}) },
      privacy: { ...current.privacy, ...(patch.privacy ?? {}) },
      updatedAt: nowIso(),
    };

    await dbPut("profile", next);
    return next;
  },

  clear: () => dbDelete("profile", ME),
};

/* ------------------------------------------------------------------ */
/* Candidates                                                          */
/* ------------------------------------------------------------------ */

export const candidates = {
  list: () => dbAll("candidates"),
  get: (id) => dbGet("candidates", id),

  /** Idempotent: only populates an empty store. */
  async seed(force = false) {
    const existing = await dbAll("candidates");
    if (existing.length > 0 && !force) return existing;
    const seeded = buildSeedCandidates();
    await dbPutMany("candidates", seeded);
    writeLs(LS_KEYS.seeded, nowIso());
    return seeded;
  },
};

/* ------------------------------------------------------------------ */
/* Likes & matches                                                     */
/* ------------------------------------------------------------------ */

export const likes = {
  list: () => dbAll("likes"),
  byTarget: (targetId) => dbByIndex("likes", "byTarget", targetId),

  async add(targetId, kind = "like") {
    const record = { id: uid("like"), targetId, kind, createdAt: nowIso() };
    await dbPut("likes", record);
    return record;
  },
};

export const matches = {
  list: () => dbAll("matches"),
  get: (id) => dbGet("matches", id),
  byTarget: (targetId) => dbByIndex("matches", "byTarget", targetId),

  async add(targetId, score) {
    const record = {
      id: uid("match"),
      targetId,
      score: score ?? null,
      createdAt: nowIso(),
      seen: false,
    };
    await dbPut("matches", record);
    return record;
  },

  async update(id, patch) {
    const current = await dbGet("matches", id);
    if (!current) return null;
    const next = { ...current, ...patch };
    await dbPut("matches", next);
    return next;
  },

  remove: (id) => dbDelete("matches", id),
};

/* ------------------------------------------------------------------ */
/* Conversations & messages                                            */
/* ------------------------------------------------------------------ */

export const conversations = {
  list: () => dbAll("conversations"),
  get: (id) => dbGet("conversations", id),
  byMatch: (matchId) => dbByIndex("conversations", "byMatch", matchId),

  async add(matchId, targetId) {
    const record = {
      id: uid("conv"),
      matchId,
      targetId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastMessage: null,
      unread: 0,
      draft: "",
    };
    await dbPut("conversations", record);
    return record;
  },

  async update(id, patch) {
    const current = await dbGet("conversations", id);
    if (!current) return null;
    const next = { ...current, ...patch, updatedAt: nowIso() };
    await dbPut("conversations", next);
    return next;
  },

  remove: (id) => dbDelete("conversations", id),
};

export const messages = {
  byConversation: (conversationId) => dbByIndex("messages", "byConversation", conversationId),

  async add(conversationId, { body, direction, flagged = null, status = "sent" }) {
    const record = {
      id: uid("msg"),
      conversationId,
      body,
      direction, // "out" | "in"
      flagged,
      status,
      readAt: null,
      createdAt: nowIso(),
    };
    await dbPut("messages", record);
    return record;
  },

  async update(id, patch) {
    const current = await dbGet("messages", id);
    if (!current) return null;
    const next = { ...current, ...patch };
    await dbPut("messages", next);
    return next;
  },

  async markConversationRead(conversationId) {
    const list = await dbByIndex("messages", "byConversation", conversationId);
    const unread = list.filter((m) => m.direction === "in" && !m.readAt);
    await Promise.all(unread.map((m) => dbPut("messages", { ...m, readAt: nowIso() })));
    return unread.length;
  },
};

/* ------------------------------------------------------------------ */
/* Safety                                                              */
/* ------------------------------------------------------------------ */

export const blocks = {
  list: () => dbAll("blocks"),
  byTarget: (targetId) => dbByIndex("blocks", "byTarget", targetId),

  async add(targetId, reason = null) {
    const record = { id: uid("block"), targetId, reason, createdAt: nowIso() };
    await dbPut("blocks", record);
    return record;
  },

  remove: (id) => dbDelete("blocks", id),
};

export const reports = {
  list: () => dbAll("reports"),

  async add({ targetId, reason, detail = "", alsoBlocked = false }) {
    const record = {
      id: uid("report"),
      targetId,
      reason,
      detail,
      alsoBlocked,
      status: "recorded-locally",
      createdAt: nowIso(),
    };
    await dbPut("reports", record);
    return record;
  },
};

export const safeDates = {
  list: () => dbAll("safeDates"),
  get: (id) => dbGet("safeDates", id),

  async add(data) {
    const record = { id: uid("safedate"), createdAt: nowIso(), status: "active", checkIns: [], ...data };
    await dbPut("safeDates", record);
    return record;
  },

  async update(id, patch) {
    const current = await dbGet("safeDates", id);
    if (!current) return null;
    const next = { ...current, ...patch };
    await dbPut("safeDates", next);
    return next;
  },

  remove: (id) => dbDelete("safeDates", id),
};

export const trustedContacts = {
  list: () => dbAll("trustedContacts"),

  async add(contact) {
    const record = { id: uid("contact"), createdAt: nowIso(), ...contact };
    await dbPut("trustedContacts", record);
    return record;
  },

  remove: (id) => dbDelete("trustedContacts", id),
};

/* ------------------------------------------------------------------ */
/* Settings & activity                                                 */
/* ------------------------------------------------------------------ */

export const settings = {
  async get(key, fallback = null) {
    const row = await dbGet("settings", key);
    return row ? row.value : fallback;
  },

  async set(key, value) {
    await dbPut("settings", { key, value, updatedAt: nowIso() });
    return value;
  },

  async all() {
    const rows = await dbAll("settings");
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  },
};

export const activity = {
  list: () => dbAll("activity"),
  async add(type, detail = {}) {
    const record = { id: uid("act"), type, detail, createdAt: nowIso() };
    await dbPut("activity", record);
    return record;
  },
};

/* ------------------------------------------------------------------ */
/* Whole-database operations                                           */
/* ------------------------------------------------------------------ */

export const data = {
  /** Full local snapshot, suitable for the export/backup feature. */
  async exportAll() {
    const entries = await Promise.all(
      Object.keys(STORES).map(async (name) => [name, await dbAll(name)])
    );
    return {
      app: "elyra",
      schemaVersion: SCHEMA_VERSION,
      exportedAt: nowIso(),
      stores: Object.fromEntries(entries),
    };
  },

  async importAll(snapshot) {
    if (!snapshot || snapshot.app !== "elyra" || !snapshot.stores) {
      throw new Error("That file isn't an Elyra export.");
    }
    if (snapshot.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(
        `That export is from a different app version (v${snapshot.schemaVersion}).`
      );
    }

    await dbClearAll();
    for (const [name, rows] of Object.entries(snapshot.stores)) {
      if (!(name in STORES) || !Array.isArray(rows) || rows.length === 0) continue;
      await dbPutMany(name, rows);
    }
    return true;
  },

  /** Clears everything, then re-seeds the demo population. */
  async resetDemo() {
    await dbClearAll();
    session.clear();
    await candidates.seed(true);
    return true;
  },

  /** Removes every trace: IndexedDB, our localStorage keys, and caches. */
  async deleteEverything() {
    await dbDestroy();

    try {
      const doomed = Object.keys(localStorage).filter((key) => key.startsWith(LS_PREFIX));
      doomed.forEach((key) => localStorage.removeItem(key));
    } catch { /* non-fatal */ }

    try {
      if (globalThis.caches) {
        const names = await caches.keys();
        await Promise.all(
          names.filter((name) => name.includes("elyra") || name.includes("workbox"))
            .map((name) => caches.delete(name))
        );
      }
    } catch { /* non-fatal */ }

    return true;
  },
};

export default {
  MODE, session, profile, candidates, likes, matches,
  conversations, messages, blocks, reports, safeDates,
  trustedContacts, settings, activity, data,
};
