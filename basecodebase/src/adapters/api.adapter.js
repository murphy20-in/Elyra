/**
 * Backend persistence adapter — NOT ACTIVE in the static build.
 *
 * This file exists to pin down the contract between the UI and a real
 * Elyra backend. It deliberately does not call anything: wiring a static
 * GitHub Pages build to imaginary endpoints would produce a UI that looks
 * connected and isn't. Every method throws until DATA_MODE=api and a real
 * API_BASE_URL are configured at build time.
 *
 * The endpoint paths below mirror the FastAPI service in this repository
 * (`codebase/app/backend`, mounted at /api/v1), so filling this in is a
 * matter of implementing `request()` and the method bodies — no UI or
 * service-layer change is required.
 *
 *   POST   /api/v1/auth/register        POST   /api/v1/auth/login
 *   POST   /api/v1/auth/refresh         POST   /api/v1/auth/logout
 *   GET    /api/v1/auth/me
 *   GET    /api/v1/profiles/me          PATCH  /api/v1/profiles/me
 *   GET    /api/v1/matches              POST   /api/v1/matches/{id}/like
 *   GET    /api/v1/chat/threads         POST   /api/v1/chat/threads/{id}/messages
 *   POST   /api/v1/safety/reports       POST   /api/v1/safety/blocks
 *   GET    /api/v1/notifications        POST   /api/v1/payments/subscribe
 *
 * Real-time chat is expected to arrive over the backend's WebSocket
 * channel rather than polling; `chat.subscribe()` is the seam for that.
 */

import { API_BASE_URL } from "../utils/config.js";

export const MODE = "api";

const NOT_WIRED =
  "The API adapter isn't implemented. This build runs in local mode — " +
  "set VITE_DATA_MODE=api and VITE_API_BASE_URL, then implement api.adapter.js.";

function notWired() {
  throw new Error(NOT_WIRED);
}

/**
 * Implement this first. It should own auth headers, refresh-on-401, and
 * unwrapping FastAPI's `{ detail: { detail, error_code } }` error shape.
 */
export async function request(path, options = {}) {
  void path;
  void options;
  void API_BASE_URL;
  return notWired();
}

const stub = () => notWired();

export const session = { get: stub, set: stub, clear: stub };
export const profile = { get: stub, save: stub, clear: stub };
export const candidates = { list: stub, get: stub, seed: stub };
export const likes = { list: stub, byTarget: stub, add: stub };
export const matches = { list: stub, get: stub, byTarget: stub, add: stub, update: stub, remove: stub };
export const conversations = { list: stub, get: stub, byMatch: stub, add: stub, update: stub, remove: stub };
export const messages = { byConversation: stub, add: stub, update: stub, markConversationRead: stub };
export const blocks = { list: stub, byTarget: stub, add: stub, remove: stub };
export const reports = { list: stub, add: stub };
export const safeDates = { list: stub, get: stub, add: stub, update: stub, remove: stub };
export const trustedContacts = { list: stub, add: stub, remove: stub };
export const settings = { get: stub, set: stub, all: stub };
export const activity = { list: stub, add: stub };
export const data = { exportAll: stub, importAll: stub, resetDemo: stub, deleteEverything: stub };

/**
 * Real-time seam. A Socket.IO or native WebSocket client slots in here;
 * the chat service already calls through this shape.
 */
export const realtime = {
  connect: stub,
  disconnect: stub,
  sendMessage: stub,
  subscribe: stub,
  markRead: stub,
  sendTyping: stub,
};

/**
 * Server-side AI services, kept as distinct boundaries so they map onto
 * the existing embedding / moderation / image / fake-profile services
 * rather than collapsing into one "AI" call.
 */
export const ai = {
  embedProfile: stub,
  moderateMessage: stub,
  moderateImage: stub,
  scoreFakeProfile: stub,
};

export const payments = { listPlans: stub, subscribe: stub, cancel: stub };
export const notifications = { list: stub, markRead: stub, registerPush: stub };

export default {
  MODE, request, session, profile, candidates, likes, matches,
  conversations, messages, blocks, reports, safeDates, trustedContacts,
  settings, activity, data, realtime, ai, payments, notifications,
};
