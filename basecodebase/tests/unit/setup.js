/**
 * Unit-test environment.
 *
 * jsdom has no IndexedDB, so the adapter tests run against
 * fake-indexeddb — a real implementation of the spec, not a mock, which
 * means the storage tests exercise the same transaction and index code
 * paths the browser does.
 */
import "fake-indexeddb/auto";

// Vite's import.meta.env doesn't exist outside a Vite transform
if (!import.meta.env) {
  import.meta.env = {};
}
