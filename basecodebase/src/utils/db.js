/**
 * Minimal promise wrapper over IndexedDB.
 *
 * Deliberately not a dependency: we need six verbs, and shipping a
 * general-purpose IDB library to a mobile-first bundle to get them is a
 * poor trade. Everything here is generic — domain shape lives in the
 * storage service above it.
 */

export const DB_NAME = "elyra";
export const DB_VERSION = 1;

/**
 * Object stores. `indexes` exist where we query by something other than
 * the primary key — notably messages by conversation, which is the only
 * read on a hot path.
 */
export const STORES = Object.freeze({
  profile: { keyPath: "id" },
  candidates: { keyPath: "id" },
  likes: { keyPath: "id", indexes: [{ name: "byTarget", keyPath: "targetId" }] },
  matches: { keyPath: "id", indexes: [{ name: "byTarget", keyPath: "targetId" }] },
  conversations: { keyPath: "id", indexes: [{ name: "byMatch", keyPath: "matchId" }] },
  messages: { keyPath: "id", indexes: [{ name: "byConversation", keyPath: "conversationId" }] },
  reports: { keyPath: "id" },
  blocks: { keyPath: "id", indexes: [{ name: "byTarget", keyPath: "targetId" }] },
  safeDates: { keyPath: "id" },
  trustedContacts: { keyPath: "id" },
  settings: { keyPath: "key" },
  activity: { keyPath: "id" },
});

let dbPromise = null;

export function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("IndexedDB is unavailable in this browser."));
      return;
    }

    const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      for (const [name, config] of Object.entries(STORES)) {
        const store = db.objectStoreNames.contains(name)
          ? request.transaction.objectStore(name)
          : db.createObjectStore(name, { keyPath: config.keyPath });

        for (const index of config.indexes ?? []) {
          if (!store.indexNames.contains(index.name)) {
            store.createIndex(index.name, index.keyPath, { unique: false });
          }
        }
      }
      void event;
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local database."));
    request.onblocked = () =>
      reject(new Error("Another Elyra tab is holding the database open."));
  });

  return dbPromise;
}

function run(storeName, mode, work) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        let outcome;
        try {
          outcome = work(store);
        } catch (error) {
          reject(error);
          return;
        }
        tx.oncomplete = () => {
          // An IDBRequest resolves to its `.result` — including when that
          // is `undefined` for a missing key. Testing the value instead of
          // the shape would hand the caller the request object itself,
          // which is truthy and would read as "found".
          const isRequest = outcome !== null && typeof outcome === "object" && "result" in outcome;
          resolve(isRequest ? outcome.result : outcome);
        };
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted."));
      })
  );
}

export const dbGet = (store, key) => run(store, "readonly", (s) => s.get(key));
export const dbAll = (store) => run(store, "readonly", (s) => s.getAll());
export const dbPut = (store, value) => run(store, "readwrite", (s) => s.put(value)).then(() => value);
export const dbDelete = (store, key) => run(store, "readwrite", (s) => s.delete(key));
export const dbClear = (store) => run(store, "readwrite", (s) => s.clear());

export function dbPutMany(store, values) {
  return run(store, "readwrite", (s) => {
    values.forEach((value) => s.put(value));
    return values.length;
  });
}

export function dbByIndex(store, indexName, value) {
  return run(store, "readonly", (s) => s.index(indexName).getAll(value));
}

/** Wipes every store but leaves the database itself in place. */
export async function dbClearAll() {
  const names = Object.keys(STORES);
  await Promise.all(names.map((name) => dbClear(name)));
}

/**
 * Drops the database entirely — used by "delete all local data".
 *
 * The open connection must be closed first. IndexedDB will not delete a
 * database that something still holds open; it fires `blocked` and waits,
 * which is an indefinite hang for the caller.
 */
export async function dbDestroy() {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      /* already failed to open — nothing to close */
    }
  }
  dbPromise = null;

  return new Promise((resolve) => {
    if (!globalThis.indexedDB) {
      resolve();
      return;
    }
    const request = globalThis.indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}
