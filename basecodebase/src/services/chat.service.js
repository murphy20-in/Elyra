/**
 * Chat.
 *
 * Local mode only: messages are written to IndexedDB in this browser.
 * There is no server, no delivery to another device, and no real second
 * participant — replies are generated locally so the interaction is
 * complete enough to use and test. The chat header and the About page
 * both say this plainly; nothing here is presented as real-time
 * multi-user messaging.
 *
 * The exported surface (connect/subscribe/sendMessage/markRead/
 * sendTyping) is the shape a Socket.IO client would satisfy, so the
 * backend can take over without the chat UI changing.
 */

import { conversations, messages, matches, candidates, activity } from "./storage.service.js";
import { checkMessage } from "../utils/moderation.js";
import { hashString } from "../utils/id.js";
import { SEED_OPENERS } from "../data/seed.js";

/** Local pub/sub standing in for a socket connection. */
const listeners = new Set();

export function subscribe(handler) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

function emit(event) {
  listeners.forEach((handler) => {
    try {
      handler(event);
    } catch (error) {
      console.error("Chat listener failed", error);
    }
  });
}

/** No-ops locally; the API adapter gives these real behaviour. */
export const connect = () => Promise.resolve({ mode: "local" });
export const disconnect = () => Promise.resolve();
export const sendTyping = () => Promise.resolve();

/** Finds or creates the conversation attached to a match. */
export async function ensureConversation(matchId) {
  const existing = await conversations.byMatch(matchId);
  if (existing.length > 0) return existing[0];

  const match = await matches.get(matchId);
  if (!match) throw new Error("That match no longer exists.");

  const conversation = await conversations.add(matchId, match.targetId);
  await activity.add("chat.started", { targetId: match.targetId });
  return conversation;
}

/** Conversation list joined to candidates, most recently active first. */
export async function listConversations() {
  const [allConversations, allCandidates] = await Promise.all([
    conversations.list(), candidates.list(),
  ]);
  const byId = new Map(allCandidates.map((candidate) => [candidate.id, candidate]));

  return allConversations
    .filter((conversation) => byId.has(conversation.targetId))
    .map((conversation) => ({ conversation, candidate: byId.get(conversation.targetId) }))
    .sort((a, b) => b.conversation.updatedAt.localeCompare(a.conversation.updatedAt));
}

export async function getThread(conversationId) {
  const conversation = await conversations.get(conversationId);
  if (!conversation) return null;

  const [list, candidate] = await Promise.all([
    messages.byConversation(conversationId),
    candidates.get(conversation.targetId),
  ]);

  return {
    conversation,
    candidate,
    messages: list.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

/** Runs the local safety filter without sending. */
export const inspect = (body) => checkMessage(body);

export async function sendMessage(conversationId, body, { acknowledgedWarning = false } = {}) {
  const text = String(body ?? "").trim();
  if (!text) throw new Error("Write something first.");
  if (text.length > 2000) throw new Error("That message is too long.");

  const flagged = checkMessage(text);

  // High-severity content requires an explicit acknowledgement to proceed
  if (flagged.flagged && !acknowledgedWarning) {
    return { blocked: true, warning: flagged };
  }

  const message = await messages.add(conversationId, {
    body: text,
    direction: "out",
    flagged: flagged.flagged ? { category: flagged.category, severity: flagged.severity } : null,
  });

  await conversations.update(conversationId, {
    lastMessage: { body: text, direction: "out", createdAt: message.createdAt },
    draft: "",
  });

  emit({ type: "message", conversationId, message });
  scheduleReply(conversationId);

  return { blocked: false, message };
}

export async function saveDraft(conversationId, draft) {
  return conversations.update(conversationId, { draft: String(draft ?? "") });
}

export async function markRead(conversationId) {
  const count = await messages.markConversationRead(conversationId);
  await conversations.update(conversationId, { unread: 0 });
  if (count > 0) emit({ type: "read", conversationId });
  return count;
}

/* ------------------------------------------------------------------ */
/* Local reply simulation                                              */
/* ------------------------------------------------------------------ */

const REPLIES = [
  "That's a good question — let me think about it properly.",
  "Ha, yes. I've been told I'm too enthusiastic about that.",
  "Honestly? Same. It's nice to hear someone say it out loud.",
  "I'd be up for that. Somewhere quiet though.",
  "Tell me more — I'm curious how you got into it.",
  "That made me smile. What's the rest of your week look like?",
];

const pending = new Map();

/**
 * Generates a reply after a short delay. Deterministic per conversation
 * so tests can rely on it, and cancelled if another send arrives first.
 */
function scheduleReply(conversationId) {
  if (pending.has(conversationId)) clearTimeout(pending.get(conversationId));

  const seed = hashString(conversationId);
  const delay = 1200 + (seed % 900);

  const timer = setTimeout(async () => {
    pending.delete(conversationId);
    try {
      const existing = await messages.byConversation(conversationId);
      const inbound = existing.filter((m) => m.direction === "in").length;
      const body = inbound === 0
        ? SEED_OPENERS[seed % SEED_OPENERS.length]
        : REPLIES[(seed + inbound) % REPLIES.length];

      const message = await messages.add(conversationId, { body, direction: "in" });
      const conversation = await conversations.get(conversationId);

      await conversations.update(conversationId, {
        lastMessage: { body, direction: "in", createdAt: message.createdAt },
        unread: (conversation?.unread ?? 0) + 1,
      });

      emit({ type: "message", conversationId, message });
    } catch (error) {
      console.error("Local reply failed", error);
    }
  }, delay);

  pending.set(conversationId, timer);
}

/** Stops pending timers — used on teardown and by the test suite. */
export function cancelPendingReplies() {
  pending.forEach((timer) => clearTimeout(timer));
  pending.clear();
}

export async function deleteConversation(conversationId) {
  const list = await messages.byConversation(conversationId);
  await Promise.all(list.map((message) => messages.update(message.id, { deleted: true })));
  await conversations.remove(conversationId);
  emit({ type: "conversation-removed", conversationId });
}
