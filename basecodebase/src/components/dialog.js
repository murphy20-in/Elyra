/**
 * Modal dialogs and bottom sheets, built on native <dialog>.
 *
 * Native <dialog> gives us the focus trap, Escape handling, inertness of
 * the page behind, and the top layer for free — all things a hand-rolled
 * modal gets subtly wrong. We add focus restoration and backdrop-click.
 */

import { esc } from "../utils/dom.js";
import { icon } from "./icons.js";

function buildDialog({ title, body, actions, variant, dismissible }) {
  const node = document.createElement("dialog");
  node.className = `dialog ${variant === "sheet" ? "dialog-sheet" : "dialog-modal"}`;

  const actionMarkup = actions
    .map(
      (action, index) =>
        `<button type="button" class="btn ${action.class ?? "btn-secondary"}" data-action="${index}">${esc(action.label)}</button>`
    )
    .join("");

  node.innerHTML = `
    <form method="dialog" class="dialog-inner">
      ${variant === "sheet" ? '<div class="sheet-grabber" aria-hidden="true"></div>' : ""}
      <div class="dialog-head">
        <h2 class="dialog-title">${esc(title)}</h2>
        ${dismissible ? `<button type="button" class="icon-btn" data-close aria-label="Close">${icon("close")}</button>` : ""}
      </div>
      <div class="dialog-body">${body}</div>
      ${actionMarkup ? `<div class="dialog-actions">${actionMarkup}</div>` : ""}
    </form>`;

  return node;
}

/**
 * @returns {Promise<any>} the chosen action's `value`, or null if dismissed
 */
export function openDialog({
  title,
  body = "",
  actions = [],
  variant = "modal",
  dismissible = true,
} = {}) {
  return new Promise((resolve) => {
    const opener = document.activeElement;
    const node = buildDialog({ title, body, actions, variant, dismissible });
    document.body.append(node);

    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      node.close();
      node.addEventListener("close", () => node.remove(), { once: true });
      // Return focus where the user left it
      if (opener?.isConnected && typeof opener.focus === "function") opener.focus();
      resolve(value);
    };

    node.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        finish(actions[Number(button.dataset.action)]?.value ?? null);
      });
    });

    node.querySelector("[data-close]")?.addEventListener("click", (event) => {
      event.preventDefault();
      finish(null);
    });

    // Backdrop click — only when the click truly lands outside the panel
    if (dismissible) {
      node.addEventListener("click", (event) => {
        if (event.target !== node) return;
        const box = node.querySelector(".dialog-inner").getBoundingClientRect();
        const outside =
          event.clientX < box.left || event.clientX > box.right ||
          event.clientY < box.top || event.clientY > box.bottom;
        if (outside) finish(null);
      });
    }

    node.addEventListener("cancel", (event) => {
      event.preventDefault();
      if (dismissible) finish(null);
    });

    node.showModal();

    // Focus the first real control, not the close button
    const first = node.querySelector(".dialog-body input, .dialog-body select, .dialog-body textarea, .dialog-body button, .dialog-actions button");
    first?.focus();
  });
}

export const openSheet = (options) => openDialog({ ...options, variant: "sheet" });

export function confirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
}) {
  return openDialog({
    title,
    body: `<p class="dialog-text">${esc(message)}</p>`,
    actions: [
      { label: cancelLabel, value: false, class: "btn-secondary" },
      { label: confirmLabel, value: true, class: danger ? "btn-danger" : "btn-primary" },
    ],
  }).then((value) => value === true);
}
