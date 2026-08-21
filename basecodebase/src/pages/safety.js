/**
 * Safety centre and Safe Date.
 *
 * Honest boundaries, stated in the UI as well as here:
 *   - Blocking is real and immediate within this app.
 *   - Reports are written to this device and reach nobody.
 *   - Safe Date runs a real countdown with real check-ins, but cannot
 *     send an SMS or place a call by itself. Emergency actions hand off
 *     to the device (tel:, the share sheet) and say when a handoff isn't
 *     available rather than silently doing nothing.
 */

import { html, raw, esc, $, $$ } from "../utils/dom.js";
import { icon } from "../components/icons.js";
import { avatar } from "../components/avatar.js";
import { emptyState } from "../components/states.js";
import { openSheet, confirmDialog } from "../components/dialog.js";
import { toastSuccess, toastError, toastWarning } from "../components/toast.js";
import { setTopbar } from "../app/shell.js";
import { navigate } from "../app/router.js";
import { setState } from "../store/store.js";
import {
  listBlocks, unblockUser, listReports, listTrustedContacts, addTrustedContact,
  removeTrustedContact, startSafeDate, getActiveSafeDate, checkIn, endSafeDate,
  raiseAlert, emergency, CHECK_IN_OPTIONS, REPORT_REASONS,
} from "../services/safety.service.js";
import { candidates } from "../services/storage.service.js";
import { validateTrustedContact } from "../utils/validate.js";
import { relativeTime, clockTime } from "../utils/format.js";

let countdownTimer = null;

const reasonLabel = (id) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

/* ------------------------------------------------------------------ */
/* Safety centre                                                       */
/* ------------------------------------------------------------------ */

export async function renderSafety(root) {
  setTopbar({ title: "Safety", subtitle: "Blocks, reports and Safe Date" });

  const [blocks, reports, contacts, active, allCandidates] = await Promise.all([
    listBlocks(), listReports(), listTrustedContacts(), getActiveSafeDate(), candidates.list(),
  ]);

  setState({ activeSafeDate: active });
  const nameOf = (id) => allCandidates.find((c) => c.id === id)?.displayName ?? "Someone";

  root.innerHTML = html`
    <div class="page page-safety">
      ${raw(active ? `
        <div class="panel safe-active">
          <div class="safe-active-head">
            <span class="pulse-dot"></span>
            <strong>Safe Date active</strong>
          </div>
          <p>${esc(active.venue)}</p>
          <a class="btn btn-primary btn-small" href="#/safety/safe-date">Open session</a>
        </div>` : "")}

      ${raw(!active && blocks.length === 0 && reports.length === 0 ? `
        <div class="panel tone-ok">
          ${icon("shieldCheck")}
          <div>
            <strong>You're all set.</strong>
            <p class="muted">No active safety incidents.</p>
          </div>
        </div>` : "")}

      <nav class="link-list">
        <a class="row-item" href="#/safety/safe-date">
          <span class="icon-tile coral">${raw(icon("pin"))}</span>
          <span class="row-copy">
            <strong>Safe Date</strong>
            <span>${active ? "Session running" : "Check-in timer and trusted contact"}</span>
          </span>
          <span class="row-arrow">${raw(icon("chevronRight"))}</span>
        </a>
      </nav>

      <section class="panel">
        <div class="panel-head">
          <h3 class="section-label">Trusted contacts</h3>
          <button type="button" class="btn btn-secondary btn-small" data-add-contact>
            ${raw(icon("plus"))} Add
          </button>
        </div>
        ${raw(contacts.length === 0
          ? '<p class="muted">Nobody added yet. A trusted contact is who Safe Date helps you reach.</p>'
          : `<ul class="row-list">${contacts.map((contact) => `
              <li class="row-item">
                <span class="icon-tile green">${icon("phone")}</span>
                <span class="row-copy"><strong>${esc(contact.name)}</strong><span>${esc(contact.phone)}</span></span>
                <button type="button" class="icon-btn" data-remove-contact="${esc(contact.id)}"
                        aria-label="Remove ${esc(contact.name)}">${icon("trash")}</button>
              </li>`).join("")}</ul>`)}
      </section>

      <section class="panel">
        <h3 class="section-label">Blocked (${blocks.length})</h3>
        ${raw(blocks.length === 0
          ? '<p class="muted">You haven\'t blocked anyone.</p>'
          : `<ul class="row-list">${blocks.map((block) => `
              <li class="row-item">
                ${avatar({ name: nameOf(block.targetId), seed: block.targetId, size: "sm" })}
                <span class="row-copy">
                  <strong>${esc(nameOf(block.targetId))}</strong>
                  <span>Blocked ${esc(relativeTime(block.createdAt))}</span>
                </span>
                <button type="button" class="btn btn-secondary btn-small" data-unblock="${esc(block.id)}">Unblock</button>
              </li>`).join("")}</ul>`)}
      </section>

      <section class="panel">
        <h3 class="section-label">Your reports (${reports.length})</h3>
        ${raw(reports.length === 0
          ? '<p class="muted">No reports filed.</p>'
          : `<ul class="row-list">${reports.map((report) => `
              <li class="row-item">
                <span class="icon-tile coral">${icon("flag")}</span>
                <span class="row-copy">
                  <strong>${esc(nameOf(report.targetId))} — ${esc(reasonLabel(report.reason))}</strong>
                  <span>${esc(relativeTime(report.createdAt))} · stored on this device</span>
                </span>
              </li>`).join("")}</ul>`)}
        <p class="field-hint">
          ${raw(icon("alert"))} Local mode: reports don't reach a moderation team.
          Blocking is the action that actually protects you here.
        </p>
      </section>

      <section class="panel">
        <h3 class="section-label">If you're in danger</h3>
        <p class="muted">
          Elyra can't contact emergency services for you. These open your phone's
          own dialler.
        </p>
        <div class="stack-actions">
          <a class="btn btn-danger" href="tel:112">${raw(icon("phone"))} Call 112</a>
          <a class="btn btn-secondary" href="tel:9152987821">Mental health helpline</a>
        </div>
      </section>
    </div>`;

  $$("[data-unblock]", root).forEach((button) => {
    button.addEventListener("click", async () => {
      await unblockUser(button.dataset.unblock);
      toastSuccess("Unblocked.");
      renderSafety(root);
    });
  });

  $$("[data-remove-contact]", root).forEach((button) => {
    button.addEventListener("click", async () => {
      await removeTrustedContact(button.dataset.removeContact);
      toastSuccess("Contact removed.");
      renderSafety(root);
    });
  });

  $("[data-add-contact]", root)?.addEventListener("click", async () => {
    const result = await openSheet({
      title: "Add a trusted contact",
      body: html`
        <div class="field">
          <label for="tcName">Name</label>
          <input id="tcName" type="text" placeholder="Who should we help you reach?" />
          <span class="field-error" data-error="name"></span>
        </div>
        <div class="field">
          <label for="tcPhone">Phone number</label>
          <input id="tcPhone" type="tel" placeholder="+91…" />
          <span class="field-error" data-error="phone"></span>
        </div>
        <p class="dialog-note">
          Stored only on this device. Elyra never contacts them on its own —
          Safe Date gives you a one-tap way to reach them yourself.
        </p>`,
      actions: [
        { label: "Cancel", value: null, class: "btn-secondary" },
        { label: "Add contact", value: "add", class: "btn-primary" },
      ],
    });

    if (result !== "add") return;

    const contact = {
      name: document.querySelector("#tcName")?.value?.trim() ?? "",
      phone: document.querySelector("#tcPhone")?.value?.trim() ?? "",
    };
    const errors = validateTrustedContact(contact);
    if (Object.keys(errors).length > 0) {
      toastError(Object.values(errors)[0]);
      return;
    }

    await addTrustedContact(contact);
    toastSuccess("Trusted contact added.");
    renderSafety(root);
  });
}

/* ------------------------------------------------------------------ */
/* Safe Date                                                           */
/* ------------------------------------------------------------------ */

function formatRemaining(ms) {
  if (ms <= 0) return "Check-in due";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((ms % 60_000) / 1000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

async function emergencySheet(session, contacts) {
  const contact = contacts.find((c) => c.id === session.contactId);

  const choice = await openSheet({
    title: "Emergency",
    dismissible: true,
    body: html`
      <p class="dialog-text">Pick what you need. Elyra hands off to your phone — it can't call or text on your behalf.</p>
      <p class="dialog-note">
        There is no automatic SOS in this build. Real alerting needs the Elyra
        backend or a native app with SMS permission.
      </p>`,
    actions: [
      { label: "Cancel", value: null, class: "btn-secondary" },
      { label: "Share my status", value: "share", class: "btn-secondary" },
      { label: contact ? `Call ${contact.name}` : "No contact saved", value: "contact", class: "btn-secondary" },
      { label: "Call 112", value: "112", class: "btn-danger" },
    ],
  });

  if (choice === "112") {
    const result = emergency.callNumber("112");
    if (!result.ok) toastError(result.reason);
    return;
  }

  if (choice === "contact") {
    if (!contact) {
      toastError("No trusted contact saved for this session.");
      return;
    }
    const result = emergency.callNumber(contact.phone);
    if (!result.ok) toastError(result.reason);
    return;
  }

  if (choice === "share") {
    const position = await emergency.getLocation();
    const where = position.ok
      ? `https://maps.google.com/?q=${position.latitude},${position.longitude}`
      : "(location unavailable)";
    const text = `I'm on a date at ${session.venue}. Started ${clockTime(session.startedAt)}. My location: ${where}`;

    const result = await emergency.shareStatus(text);
    if (result.ok) {
      toastSuccess("Share sheet opened.");
      return;
    }

    // No share support — give them something they can still act on
    try {
      await navigator.clipboard.writeText(text);
      toastWarning("Sharing isn't available here. Message copied to your clipboard.");
    } catch {
      toastError(result.reason);
    }
  }
}

function startCountdown(session, root) {
  clearInterval(countdownTimer);

  const tick = () => {
    const node = $("#safeCountdown", root);
    if (!node) {
      clearInterval(countdownTimer);
      return;
    }
    const remaining = new Date(session.nextCheckInAt).getTime() - Date.now();
    node.textContent = formatRemaining(remaining);
    node.classList.toggle("is-due", remaining <= 0);

    const banner = $("#checkInDue", root);
    if (banner) banner.hidden = remaining > 0;
  };

  tick();
  countdownTimer = setInterval(tick, 1000);
}

export function teardownSafeDate() {
  clearInterval(countdownTimer);
  countdownTimer = null;
}

export async function renderSafeDate(root) {
  setTopbar({ title: "Safe Date", back: "/safety" });
  teardownSafeDate();

  const [active, contacts, allCandidates] = await Promise.all([
    getActiveSafeDate(), listTrustedContacts(), candidates.list(),
  ]);

  if (active) {
    renderActiveSession(root, active, contacts);
    return;
  }

  if (contacts.length === 0) {
    root.innerHTML = html`
      <div class="page">
        ${raw(emptyState({
          glyph: "shield",
          title: "Add a trusted contact first",
          message: "Safe Date works by giving you one tap to reach someone you trust. Add them before starting a session.",
          action: { id: "go-safety", label: "Add a contact" },
        }))}
      </div>`;
    root.querySelector('[data-state-action="go-safety"]')
      ?.addEventListener("click", () => navigate("/safety"));
    return;
  }

  root.innerHTML = html`
    <form class="page page-safe-date" id="safeForm">
      <div class="panel tone-note">
        ${raw(icon("shield"))}
        <p>
          Safe Date runs a check-in timer on this device. If you miss a check-in
          it tells <em>you</em> — it can't message anyone by itself. Every
          emergency action opens your phone's dialler or share sheet.
        </p>
      </div>

      <section class="panel">
        <h3 class="section-label">Set up your date</h3>
        <div class="field">
          <label for="sdWith">Who are you meeting?</label>
          <select id="sdWith">
            <option value="">Not from Elyra</option>
            ${raw(allCandidates.map((c) =>
              `<option value="${esc(c.id)}">${esc(c.displayName)}</option>`).join(""))}
          </select>
        </div>

        <div class="field">
          <label for="sdVenue">Where?</label>
          <input id="sdVenue" type="text" placeholder="Cafe, cinema, address…" required />
        </div>

        <div class="field">
          <label for="sdContact">Trusted contact</label>
          <select id="sdContact" required>
            ${raw(contacts.map((c) =>
              `<option value="${esc(c.id)}">${esc(c.name)} — ${esc(c.phone)}</option>`).join(""))}
          </select>
        </div>

        <fieldset class="field">
          <legend>Check in</legend>
          <div class="segmented" role="radiogroup" aria-label="Check-in interval">
            ${raw(CHECK_IN_OPTIONS.map((option, i) => `
              <button type="button" role="radio" aria-checked="${i === 1}"
                      class="segment ${i === 1 ? "is-selected" : ""}"
                      data-interval="${option.minutes}">${esc(option.label)}</button>`).join(""))}
          </div>
        </fieldset>

        <button type="submit" class="btn btn-primary btn-grow">Start Safe Date</button>
      </section>
    </form>`;

  let interval = 60;
  $$("[data-interval]", root).forEach((button) => {
    button.addEventListener("click", () => {
      interval = Number(button.dataset.interval);
      $$("[data-interval]", root).forEach((other) => {
        const on = other === button;
        other.classList.toggle("is-selected", on);
        other.setAttribute("aria-checked", String(on));
      });
    });
  });

  $("#safeForm", root).addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const meetingWith = $("#sdWith").value || null;
      await startSafeDate({
        meetingWith,
        venue: $("#sdVenue").value.trim(),
        contactId: $("#sdContact").value,
        checkInMinutes: interval,
      });
      toastSuccess("Safe Date started.");
      renderSafeDate(root);
    } catch (error) {
      toastError(error.message);
    }
  });
}

function renderActiveSession(root, session, contacts) {
  const contact = contacts.find((c) => c.id === session.contactId);

  root.innerHTML = html`
    <div class="page page-safe-active">
      <div class="panel safe-hero">
        <div class="safe-active-head">
          <span class="pulse-dot"></span>
          <strong>Safe Date active</strong>
        </div>
        <h2 class="safe-venue">${session.venue}</h2>
        <dl class="safe-facts">
          <div><dt>Started</dt><dd>${clockTime(session.startedAt)}</dd></div>
          <div><dt>Next check-in</dt><dd id="safeCountdown" class="countdown">—</dd></div>
          <div><dt>Trusted contact</dt><dd>${contact ? contact.name : "None"}</dd></div>
          <div><dt>Check-ins</dt><dd>${(session.checkIns ?? []).length}</dd></div>
        </dl>
      </div>

      <div class="panel tone-warning" id="checkInDue" hidden>
        ${raw(icon("alert"))}
        <p>Your check-in is due. Tap <strong>I'm safe</strong> to reset the timer.</p>
      </div>

      <div class="stack-actions">
        <button type="button" class="btn btn-primary btn-grow" data-checkin>I&#39;m safe</button>
        <button type="button" class="btn btn-danger" data-emergency>${raw(icon("alert"))} Need help</button>
      </div>

      <button type="button" class="btn btn-secondary btn-grow" data-end>End Safe Date</button>

      <p class="page-note">
        ${raw(icon("alert"))}
        Elyra can't send an SMS or call anyone automatically. "Need help" opens
        your phone's dialler or share sheet — you stay in control of what's sent.
      </p>
    </div>`;

  startCountdown(session, root);

  $("[data-checkin]", root)?.addEventListener("click", async () => {
    const updated = await checkIn(session.id);
    toastSuccess("Checked in. Timer reset.");
    renderActiveSession(root, updated, contacts);
  });

  $("[data-emergency]", root)?.addEventListener("click", async () => {
    await raiseAlert(session.id);
    await emergencySheet(session, contacts);
  });

  $("[data-end]", root)?.addEventListener("click", async () => {
    const ok = await confirmDialog({
      title: "End this Safe Date?",
      message: "The check-in timer stops and the session is closed.",
      confirmLabel: "End session",
    });
    if (!ok) return;
    teardownSafeDate();
    await endSafeDate(session.id);
    setState({ activeSafeDate: null });
    toastSuccess("Safe Date ended.");
    navigate("/safety");
  });
}
