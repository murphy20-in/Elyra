/**
 * Settings — including the storage tools that make local-first honest:
 * export, import, reset demo data, and delete everything.
 */

import { html, raw, $, $$ } from "../utils/dom.js";
import { icon } from "../components/icons.js";
import { confirmDialog, openSheet } from "../components/dialog.js";
import { toastSuccess, toastError, toastWarning } from "../components/toast.js";
import { setTopbar } from "../app/shell.js";
import { navigate } from "../app/router.js";
import { getState, setState } from "../store/store.js";
import { data as dataStore, settings as settingsStore } from "../services/storage.service.js";
import { signOut } from "../services/auth.service.js";
import { DATA_MODE, LS_KEYS, APP_NAME } from "../utils/config.js";
import {
  canInstall, promptInstall, isIosSafari, isStandalone, dismissInstall, applyUpdate,
} from "../app/pwa.js";

const APP_VERSION = "1.0.0";

/* ------------------------------------------------------------------ */
/* Storage tools                                                       */
/* ------------------------------------------------------------------ */

async function exportData() {
  try {
    const snapshot = await dataStore.exportAll();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `elyra-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    toastWarning("Exported. This file contains your profile and messages — store it carefully.");
  } catch (error) {
    toastError(error.message || "Export failed.");
  }
}

function importData(root) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    const ok = await confirmDialog({
      title: "Replace everything with this backup?",
      message: "Your current profile, matches and messages on this device are overwritten. This can't be undone.",
      confirmLabel: "Import and replace",
      danger: true,
    });
    if (!ok) return;

    try {
      const snapshot = JSON.parse(await file.text());
      await dataStore.importAll(snapshot);
      toastSuccess("Backup imported.");
      window.location.reload();
    } catch (error) {
      toastError(error.message || "That file couldn't be read.");
    }
  });

  input.click();
  void root;
}

async function resetDemo() {
  const ok = await confirmDialog({
    title: "Reset all local Elyra data?",
    message: "Your profile, matches, conversations and safety records are cleared, and the demo population is restored. This cannot be undone.",
    confirmLabel: "Reset everything",
    danger: true,
  });
  if (!ok) return;

  try {
    await dataStore.resetDemo();
    toastSuccess("Demo data reset.");
    window.location.hash = "#/";
    window.location.reload();
  } catch (error) {
    toastError(error.message || "Reset failed.");
  }
}

async function deleteEverything() {
  const ok = await confirmDialog({
    title: "Delete all local data?",
    message: "Everything Elyra stores in this browser is erased — profile, messages, matches, settings and cached files. You'll return to onboarding.",
    confirmLabel: "Delete it all",
    danger: true,
  });
  if (!ok) return;

  const reallyOk = await confirmDialog({
    title: "Last check",
    message: "This is permanent and there is no backup unless you exported one.",
    confirmLabel: "Yes, delete everything",
    danger: true,
  });
  if (!reallyOk) return;

  try {
    await dataStore.deleteEverything();
    window.location.hash = "#/";
    window.location.reload();
  } catch (error) {
    toastError(error.message || "Couldn't delete local data.");
  }
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export async function renderSettings(root) {
  setTopbar({ title: "Settings" });

  const state = getState();
  const stored = await settingsStore.all();
  const notificationsOn = stored.notifications ?? false;
  const installed = isStandalone();
  const installable = canInstall(state);

  root.innerHTML = html`
    <div class="page page-settings">
      <section class="panel">
        <h3 class="section-label">Account</h3>
        <div class="setting-row">
          <div class="setting-copy">
            <strong>Local account</strong>
            <span>This device only. No password, no server — nothing to sign in to.</span>
          </div>
          <span class="tag tag-mode">${DATA_MODE === "local" ? "Local PWA mode" : "API mode"}</span>
        </div>
        <div class="stack-actions">
          <a class="btn btn-secondary btn-small" href="#/profile/edit">Edit profile</a>
          <button type="button" class="btn btn-secondary btn-small" data-signout>Sign out of this device</button>
        </div>
      </section>

      <nav class="link-list">
        <a class="row-item" href="#/privacy">
          <span class="icon-tile teal">${raw(icon("eye"))}</span>
          <span class="row-copy"><strong>Privacy</strong><span>Visibility, location, anonymous mode</span></span>
          <span class="row-arrow">${raw(icon("chevronRight"))}</span>
        </a>
        <a class="row-item" href="#/safety">
          <span class="icon-tile coral">${raw(icon("shield"))}</span>
          <span class="row-copy"><strong>Safety</strong><span>Blocks, reports, Safe Date</span></span>
          <span class="row-arrow">${raw(icon("chevronRight"))}</span>
        </a>
        <a class="row-item" href="#/premium">
          <span class="icon-tile">${raw(icon("sparkles"))}</span>
          <span class="row-copy"><strong>Premium</strong><span>Plans and verification</span></span>
          <span class="row-arrow">${raw(icon("chevronRight"))}</span>
        </a>
      </nav>

      <section class="panel">
        <h3 class="section-label">Notifications</h3>
        <div class="setting-row">
          <div class="setting-copy">
            <strong>Push notifications</strong>
            <span>
              Not available in this build. Push needs a server to send from, and
              a static site has none. The permission flow is wired for when the
              backend lands.
            </span>
          </div>
          <button type="button" class="switch" role="switch" aria-checked="false"
                  data-notifications disabled aria-label="Push notifications (unavailable)">
            <span class="switch-knob"></span>
          </button>
        </div>
      </section>

      <section class="panel">
        <h3 class="section-label">App</h3>
        ${raw(installed ? `
          <div class="setting-row">
            <div class="setting-copy">
              <strong>Installed</strong>
              <span>You're running Elyra as an installed app.</span>
            </div>
            <span class="tag tag-ok">${icon("check")} Installed</span>
          </div>` : installable ? `
          <div class="setting-row">
            <div class="setting-copy">
              <strong>Install Elyra</strong>
              <span>Add Elyra to your home screen for a faster, app-like experience.</span>
            </div>
            <button type="button" class="btn btn-primary btn-small" data-install>${icon("install")} Install</button>
          </div>` : isIosSafari() ? `
          <div class="setting-copy">
            <strong>Install on iPhone or iPad</strong>
            <span>Tap the Share button in Safari, then choose <strong>Add to Home Screen</strong>.</span>
          </div>` : `
          <div class="setting-copy">
            <strong>Install Elyra</strong>
            <span>Your browser hasn't offered installation yet. In Chrome or Edge, look for the install icon in the address bar.</span>
          </div>`)}

        ${raw(state.updateReady ? `
          <div class="setting-row">
            <div class="setting-copy"><strong>Update available</strong><span>A newer version is ready to load.</span></div>
            <button type="button" class="btn btn-primary btn-small" data-update>Reload</button>
          </div>` : "")}
      </section>

      <section class="panel">
        <h3 class="section-label">Storage</h3>
        <p class="muted">
          Elyra keeps your profile, matches and messages in this browser's
          IndexedDB, and small preferences in localStorage. Clearing your browser
          data removes all of it.
        </p>
        <div class="stack-actions wrap">
          <button type="button" class="btn btn-secondary btn-small" data-export>${raw(icon("download"))} Export</button>
          <button type="button" class="btn btn-secondary btn-small" data-import>${raw(icon("upload"))} Import</button>
          <button type="button" class="btn btn-secondary btn-small" data-reset>${raw(icon("refresh"))} Reset demo data</button>
          <button type="button" class="btn btn-danger btn-small" data-delete>${raw(icon("trash"))} Delete all local data</button>
        </div>
        <p class="field-hint">
          ${raw(icon("alert"))} An exported file contains your profile and message
          history in plain JSON. Anyone who opens it can read it.
        </p>
      </section>

      <section class="panel">
        <h3 class="section-label">About</h3>
        <dl class="detail-list">
          <div><dt>App</dt><dd>${APP_NAME} ${APP_VERSION}</dd></div>
          <div><dt>Mode</dt><dd>${DATA_MODE === "local" ? "Local PWA mode" : "API mode"}</dd></div>
          <div><dt>Data</dt><dd>IndexedDB on this device</dd></div>
        </dl>
        <p class="muted">
          This build is a static Progressive Web App with no backend. That means
          no real authentication, no messaging with other people, no server-side
          AI moderation, no payments, and no automated emergency alerts. Each of
          those is labelled where it appears rather than simulated silently.
        </p>
        <button type="button" class="btn btn-secondary btn-small" data-limits>What's real and what isn't</button>
      </section>
    </div>`;

  $("[data-install]", root)?.addEventListener("click", async () => {
    const result = await promptInstall(getState());
    if (result.ok) toastSuccess("Installing Elyra…");
    else if (result.reason === "dismissed") dismissInstall();
  });

  $("[data-update]", root)?.addEventListener("click", applyUpdate);
  $("[data-export]", root)?.addEventListener("click", exportData);
  $("[data-import]", root)?.addEventListener("click", () => importData(root));
  $("[data-reset]", root)?.addEventListener("click", resetDemo);
  $("[data-delete]", root)?.addEventListener("click", deleteEverything);

  $("[data-signout]", root)?.addEventListener("click", async () => {
    const ok = await confirmDialog({
      title: "Sign out?",
      message: "Your data stays on this device. You'll go back to the start screen.",
      confirmLabel: "Sign out",
    });
    if (!ok) return;
    await signOut();
    setState({ profile: null });
    window.location.hash = "#/";
    window.location.reload();
  });

  $("[data-limits]", root)?.addEventListener("click", () => {
    openSheet({
      title: "What's real in this build",
      body: html`
        <h4 class="detail-heading">Real</h4>
        <ul class="reason-list">
          <li>Your profile, matches and messages persist in this browser.</li>
          <li>Matching scores are computed here, and the breakdown is the real calculation.</li>
          <li>Blocking removes matches and conversations immediately.</li>
          <li>Safe Date runs a genuine countdown with check-ins.</li>
          <li>The app installs and works offline.</li>
        </ul>
        <h4 class="detail-heading">Not real yet</h4>
        <ul class="reason-list">
          <li>Authentication — there's no server to verify anything against.</li>
          <li>Chat partners — replies are generated on this device.</li>
          <li>AI moderation — the filter is local pattern matching, not the production model.</li>
          <li>Reports — stored here, delivered to nobody.</li>
          <li>Emergency SMS/SOS — the browser can't send these; actions hand off to your phone.</li>
          <li>Payments and verification badges.</li>
        </ul>`,
      actions: [{ label: "Got it", value: null, class: "btn-primary" }],
    });
  });

  $$("[data-notifications]", root).forEach((button) => {
    button.addEventListener("click", () => {
      toastWarning("Push notifications need a backend to send them.");
    });
  });

  void notificationsOn;
  void LS_KEYS;
  void navigate;
}
