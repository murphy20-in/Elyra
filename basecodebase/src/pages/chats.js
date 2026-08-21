/**
 * Conversation list and the message thread.
 *
 * The thread is a real messaging surface: sticky composer, date
 * separators, read state, typing indicator, drafts that survive
 * navigation, and the safety check before an outbound message. What it
 * is not — and says it is not — is a connection to another person.
 */

import { html, raw, esc, $ } from "../utils/dom.js";
import { icon } from "../components/icons.js";
import { avatar } from "../components/avatar.js";
import { emptyState, skeletonList } from "../components/states.js";
import { openSheet, confirmDialog } from "../components/dialog.js";
import { toastSuccess, toastError, toastWarning } from "../components/toast.js";
import { setTopbar } from "../app/shell.js";
import { navigate } from "../app/router.js";
import { setState, getState } from "../store/store.js";
import {
  listConversations, getThread, sendMessage, markRead, saveDraft,
  subscribe as subscribeChat, deleteConversation,
} from "../services/chat.service.js";
import { blockUser, reportUser, REPORT_REASONS } from "../services/safety.service.js";
import { clockTime, dayLabel, relativeTime } from "../utils/format.js";

let unsubscribe = null;

/** Keeps the Chats tab badge honest across the whole app. */
export async function refreshUnreadCount() {
  const rows = await listConversations();
  const total = rows.reduce((sum, row) => sum + (row.conversation.unread ?? 0), 0);
  setState({ unreadTotal: total });
  return total;
}

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

export async function renderChats(root) {
  setTopbar({ title: "Chats", subtitle: "Conversations with your matches" });
  root.innerHTML = `<div class="page">${skeletonList(4)}</div>`;

  const rows = await listConversations();
  await refreshUnreadCount();

  if (rows.length === 0) {
    root.innerHTML = html`
      <div class="page">
        ${raw(emptyState({
          glyph: "chat",
          title: "No conversations yet",
          message: "When you match with someone, your conversation will appear here.",
          action: { id: "go-matches", label: "See your matches" },
        }))}
      </div>`;
    root.querySelector('[data-state-action="go-matches"]')
      ?.addEventListener("click", () => navigate("/matches"));
    return;
  }

  root.innerHTML = html`
    <div class="page page-chats">
      <ul class="row-list">
        ${raw(rows.map(({ conversation, candidate }) => {
          const last = conversation.lastMessage;
          const preview = last
            ? `${last.direction === "out" ? "You: " : ""}${last.body}`
            : "Say hello";
          return `
            <li>
              <a class="row-item ${conversation.unread ? "is-unread" : ""}" href="#/chats/${esc(conversation.id)}">
                ${avatar({ name: candidate.displayName, seed: candidate.id, size: "md" })}
                <span class="row-copy">
                  <strong>${esc(candidate.displayName)}</strong>
                  <span class="row-preview">${esc(preview)}</span>
                </span>
                <span class="row-meta">
                  <span>${esc(last ? relativeTime(last.createdAt) : "")}</span>
                  ${conversation.unread ? `<span class="nav-badge">${conversation.unread}</span>` : ""}
                </span>
              </a>
            </li>`;
        }).join(""))}
      </ul>
      <p class="page-note">
        ${raw(icon("alert"))}
        Local demo: replies are generated on this device. No messages leave your browser.
      </p>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Thread                                                              */
/* ------------------------------------------------------------------ */

function messageGroups(messages) {
  const groups = [];
  let currentDay = null;
  for (const message of messages) {
    const label = dayLabel(message.createdAt);
    if (label !== currentDay) {
      groups.push({ separator: label });
      currentDay = label;
    }
    groups.push({ message });
  }
  return groups;
}

function bubble(message, readReceipts) {
  const flagClass = message.flagged ? " is-flagged" : "";
  const status = message.direction === "out" && readReceipts
    ? `<span class="bubble-status">${message.readAt ? "Read" : "Sent"}</span>`
    : "";

  return `
    <li class="bubble-row bubble-${esc(message.direction)}">
      <div class="bubble${flagClass}">
        ${message.flagged ? `<span class="bubble-flag">${icon("alert")} Flagged: ${esc(message.flagged.category)}</span>` : ""}
        <p>${esc(message.body)}</p>
        <span class="bubble-time">${esc(clockTime(message.createdAt))}${status ? " · " : ""}</span>
        ${status}
      </div>
    </li>`;
}

/** The indicator has exactly one owner, so it can't get stuck on. */
function setTyping(on) {
  const indicator = $("#typingIndicator");
  if (indicator) indicator.hidden = !on;
}

function scrollToEnd(smooth = false) {
  const scroller = $("#threadScroll");
  if (!scroller) return;
  scroller.scrollTo({ top: scroller.scrollHeight, behavior: smooth ? "smooth" : "auto" });
}

async function paintThread(root, conversationId) {
  const thread = await getThread(conversationId);
  if (!thread) {
    navigate("/chats", { replace: true });
    return null;
  }

  const { conversation, candidate, messages } = thread;
  const readReceipts = getState().profile?.privacy?.readReceipts ?? true;

  setTopbar({
    title: candidate.displayName,
    subtitle: "Local demo conversation",
    back: "/chats",
    actions: `<button type="button" class="icon-btn" data-thread-menu aria-label="Safety options">${icon("shield")}</button>`,
  });

  root.innerHTML = html`
    <div class="thread">
      <div class="thread-scroll" id="threadScroll">
        <div class="thread-intro">
          ${raw(avatar({ name: candidate.displayName, seed: candidate.id, size: "lg" }))}
          <h2>${candidate.displayName}</h2>
          <p>${candidate.city} · ${candidate.pronouns}</p>
          <p class="thread-disclaimer">
            ${raw(icon("alert"))}
            Replies here are generated locally for the demo. Nothing is sent to
            another person, and no real-time service is connected.
          </p>
        </div>

        <ul class="bubble-list" id="bubbleList">
          ${raw(messageGroups(messages).map((entry) =>
            entry.separator
              ? `<li class="day-separator"><span>${esc(entry.separator)}</span></li>`
              : bubble(entry.message, readReceipts)
          ).join(""))}
        </ul>

        <div class="typing-indicator" id="typingIndicator" hidden aria-live="polite">
          <span></span><span></span><span></span>
        </div>
      </div>

      <form class="composer" id="composer" autocomplete="off">
        <label class="visually-hidden" for="composerInput">Message ${candidate.displayName}</label>
        <textarea id="composerInput" name="body" rows="1" maxlength="2000"
                  placeholder="Write a message">${esc(conversation.draft ?? "")}</textarea>
        <button type="submit" class="round-btn round-send" aria-label="Send message">${raw(icon("send"))}</button>
      </form>
    </div>`;

  scrollToEnd();
  await markRead(conversationId);
  await refreshUnreadCount();

  return thread;
}

async function handleSend(conversationId, root) {
  const input = $("#composerInput");
  const body = input.value.trim();
  if (!body) return;

  let result = await sendMessage(conversationId, body);

  // The filter fired — the user decides what happens next
  if (result.blocked) {
    const choice = await openSheet({
      title: "Check this before sending",
      dismissible: true,
      body: html`
        <p class="dialog-text">${result.warning.message}</p>
        <blockquote class="quoted-message">${body}</blockquote>
        <p class="dialog-note">
          This check runs on your device using simple pattern matching. It isn't
          the server-side moderation model, and it can be wrong.
        </p>`,
      actions: [
        { label: "Cancel", value: "cancel", class: "btn-secondary" },
        { label: "Edit message", value: "edit", class: "btn-secondary" },
        { label: "Send anyway", value: "send", class: "btn-danger" },
      ],
    });

    if (choice === "cancel") return;
    if (choice === "edit" || choice === null) {
      input.focus();
      return;
    }

    result = await sendMessage(conversationId, body, { acknowledgedWarning: true });
    toastWarning("Sent with a safety flag recorded.");
  }

  input.value = "";
  input.style.height = "auto";
  await saveDraft(conversationId, "");
  await paintMessagesOnly(conversationId);
  // Only now is a reply actually pending — a blocked send never gets here
  setTyping(true);
  scrollToEnd(true);
  void root;
}

/** Repaints just the bubble list, so the composer keeps focus and caret. */
async function paintMessagesOnly(conversationId) {
  const thread = await getThread(conversationId);
  if (!thread) return;
  const list = $("#bubbleList");
  if (!list) return;
  const readReceipts = getState().profile?.privacy?.readReceipts ?? true;
  list.innerHTML = messageGroups(thread.messages).map((entry) =>
    entry.separator
      ? `<li class="day-separator"><span>${esc(entry.separator)}</span></li>`
      : bubble(entry.message, readReceipts)
  ).join("");
}

async function openThreadMenu(candidate, conversationId) {
  const choice = await openSheet({
    title: `${candidate.displayName} — safety`,
    body: html`
      <p class="dialog-text">Blocking removes the match and this conversation. They're never notified.</p>`,
    actions: [
      { label: "Close", value: null, class: "btn-secondary" },
      { label: "Report", value: "report", class: "btn-secondary" },
      { label: "Block", value: "block", class: "btn-danger" },
    ],
  });

  if (choice === "block") {
    const ok = await confirmDialog({
      title: `Block ${candidate.displayName}?`,
      message: "This removes your match and conversation immediately.",
      confirmLabel: "Block",
      danger: true,
    });
    if (!ok) return;
    await blockUser(candidate.id);
    await deleteConversation(conversationId).catch(() => {});
    toastSuccess(`${candidate.displayName} blocked.`);
    navigate("/chats");
    return;
  }

  if (choice !== "report") return;

  const submitted = await openSheet({
    title: `Report ${candidate.displayName}`,
    body: html`
      <div class="radio-list">
        ${raw(REPORT_REASONS.map((reason, i) => `
          <label class="radio-row">
            <input type="radio" name="threadReason" value="${esc(reason.id)}"${i === 0 ? " checked" : ""} />
            <span>${esc(reason.label)}</span>
          </label>`).join(""))}
      </div>
      <p class="dialog-note">Stored on this device only in local mode. Blocking is immediate and real.</p>`,
    actions: [
      { label: "Cancel", value: null, class: "btn-secondary" },
      { label: "Report and block", value: "submit", class: "btn-danger" },
    ],
  });

  if (submitted !== "submit") return;

  const reason = document.querySelector('input[name="threadReason"]:checked')?.value ?? "other";
  try {
    await reportUser({ targetId: candidate.id, reason, alsoBlock: true });
    await deleteConversation(conversationId).catch(() => {});
    toastSuccess("Report saved and user blocked.");
    navigate("/chats");
  } catch (error) {
    toastError(error.message);
  }
}

export async function renderChatThread(root, { id }) {
  // Opts this route into the full-height layout so the composer pins to
  // the bottom of the column instead of scrolling with the messages.
  document.body.dataset.view = "thread";
  root.innerHTML = `<div class="page">${skeletonList(3)}</div>`;

  const enteredAt = window.location.hash;
  const thread = await paintThread(root, id);

  // A faster navigation can land while paintThread is awaiting storage,
  // replacing the DOM this function is about to wire up. Bail rather than
  // operating on elements that belong to a view the user has left.
  if (!thread || window.location.hash !== enteredAt) return;

  const input = $("#composerInput");
  const form = $("#composer");
  if (!input || !form) return;

  // Grow the composer with its content, up to a ceiling
  const autosize = () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  };
  input.addEventListener("input", autosize);
  autosize();

  // Persist the draft so leaving the thread doesn't lose it
  let draftTimer;
  input?.addEventListener("input", () => {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => saveDraft(id, input.value), 400);
  });

  // Enter sends on desktop; Shift+Enter is a newline. Mobile keyboards
  // send a plain Enter as a newline, which is what people expect there.
  input?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    event.preventDefault();
    form.requestSubmit();
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSend(id, root);
  });

  document.querySelector("[data-thread-menu]")
    ?.addEventListener("click", () => openThreadMenu(thread.candidate, id));

  // Live updates from the local reply simulation
  unsubscribe?.();
  unsubscribe = subscribeChat(async (event) => {
    if (event.conversationId !== id) return;
    if (event.type === "message" && event.message.direction === "in") {
      setTyping(false);
      await paintMessagesOnly(id);
      await markRead(id);
      await refreshUnreadCount();
      scrollToEnd(true);
    }
  });

}

export function teardownChat() {
  unsubscribe?.();
  unsubscribe = null;
}
