/**
 * Privacy dashboard.
 *
 * Every control carries a plain sentence describing its actual effect.
 * A privacy setting whose consequence isn't stated is a setting nobody
 * can make an informed choice about.
 */

import { html, raw, esc, $$ } from "../utils/dom.js";
import { icon } from "../components/icons.js";
import { toastSuccess, toastError } from "../components/toast.js";
import { openSheet } from "../components/dialog.js";
import { setTopbar } from "../app/shell.js";
import { getProfile, savePrivacy } from "../services/profile.service.js";
import { setState } from "../store/store.js";
import { LOCATION_PRECISION } from "../utils/config.js";
import { emergency } from "../services/safety.service.js";

const TOGGLES = [
  {
    key: "discoverable",
    label: "Appear in Discover",
    on: "Your profile is shown to other people.",
    off: "You're hidden from Discover. You can still message existing matches.",
  },
  {
    key: "showOnlineStatus",
    label: "Show online status",
    on: "Matches can see when you're active.",
    off: "Nobody can see when you're online. Off by default.",
  },
  {
    key: "readReceipts",
    label: "Read receipts",
    on: "Matches can see when you've read a message.",
    off: "Nobody sees whether you've read a message — and you won't see theirs.",
  },
  {
    key: "anonymousMode",
    label: "Anonymous mode",
    on: "Your display name is replaced with a neutral handle in chat, and identity details are hidden until you reveal them.",
    off: "Your public profile is shown normally.",
  },
];

const VISIBILITY = [
  { id: "everyone", label: "Everyone" },
  { id: "matches", label: "Matches only" },
  { id: "nobody", label: "Nobody" },
];

function toggleRow(setting, value) {
  return `
    <div class="setting-row">
      <div class="setting-copy">
        <strong>${esc(setting.label)}</strong>
        <span>${esc(value ? setting.on : setting.off)}</span>
      </div>
      <button type="button" class="switch ${value ? "is-on" : ""}" role="switch"
              aria-checked="${value}" data-toggle="${esc(setting.key)}"
              aria-label="${esc(setting.label)}">
        <span class="switch-knob"></span>
      </button>
    </div>`;
}

export async function renderPrivacy(root) {
  setTopbar({ title: "Privacy", subtitle: "You choose what people see", back: "/profile" });

  const profile = await getProfile();
  const privacy = profile.privacy;

  root.innerHTML = html`
    <div class="page page-privacy">
      <div class="panel tone-note">
        ${raw(icon("shield"))}
        <p>
          Straight answer about this build: everything you enter lives in this
          browser, on this device. It isn't uploaded, shared, or encrypted by
          us — the controls below govern what the app shows, not what a server
          holds, because there is no server yet.
        </p>
      </div>

      <section class="panel">
        <h3 class="section-label">Visibility</h3>
        ${raw(TOGGLES.map((setting) => toggleRow(setting, privacy[setting.key])).join(""))}
      </section>

      <section class="panel">
        <h3 class="section-label">Profile visibility</h3>
        <div class="segmented" role="radiogroup" aria-label="Who can see your profile">
          ${raw(VISIBILITY.map((option) => `
            <button type="button" role="radio" aria-checked="${privacy.profileVisibility === option.id}"
                    class="segment ${privacy.profileVisibility === option.id ? "is-selected" : ""}"
                    data-visibility="${esc(option.id)}">${esc(option.label)}</button>`).join(""))}
        </div>
        <p class="field-hint">Controls who Discover will show your profile to.</p>
      </section>

      <section class="panel">
        <h3 class="section-label">Location precision</h3>
        <div class="choice-list" role="radiogroup" aria-label="Location precision">
          ${raw(LOCATION_PRECISION.map((option) => `
            <button type="button" role="radio" aria-checked="${privacy.locationPrecision === option.id}"
                    class="choice choice-row ${privacy.locationPrecision === option.id ? "is-selected" : ""}"
                    data-location="${esc(option.id)}">
              <span class="choice-copy"><strong>${esc(option.label)}</strong><span>${esc(option.blurb)}</span></span>
              <span class="choice-tick">${icon("check")}</span>
            </button>`).join(""))}
        </div>
        <p class="field-hint">
          Exact coordinates are never stored. Choosing "Precise" asks your
          browser for a one-time reading, and only when you tap it.
        </p>
      </section>

      <section class="panel">
        <h3 class="section-label">${raw(icon("lock"))} Private layer</h3>
        <p class="muted">
          Your private fields are held back from Discover and from matches.
          Reveals — releasing part of that layer to one person, revocably —
          arrive with the backend; there's no second device to reveal to in a
          local-only build.
        </p>
        <a class="btn btn-secondary btn-small" href="#/profile/edit">Edit private fields</a>
      </section>
    </div>`;

  const persist = async (patch, message) => {
    try {
      await savePrivacy(patch);
      setState({ profile: await getProfile() });
      toastSuccess(message);
      renderPrivacy(root);
    } catch (error) {
      toastError(error.message || "Couldn't save that setting.");
    }
  };

  $$("[data-toggle]", root).forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.toggle;
      persist({ [key]: !privacy[key] }, "Privacy updated");
    });
  });

  $$("[data-visibility]", root).forEach((button) => {
    button.addEventListener("click", () =>
      persist({ profileVisibility: button.dataset.visibility }, "Visibility updated")
    );
  });

  $$("[data-location]", root).forEach((button) => {
    button.addEventListener("click", async () => {
      const choice = button.dataset.location;

      // Never request the browser permission without explaining first
      if (choice === "precise") {
        const ok = await openSheet({
          title: "Use precise location?",
          body: html`
            <p class="dialog-text">
              Your browser will ask for permission. Elyra reads the position
              once to estimate distance, converts it to a coarse band, and does
              not store your coordinates.
            </p>
            <p class="dialog-note">You can switch back to approximate at any time.</p>`,
          actions: [
            { label: "Not now", value: null, class: "btn-secondary" },
            { label: "Continue", value: "go", class: "btn-primary" },
          ],
        });
        if (choice !== "precise" || ok !== "go") return;

        const position = await emergency.getLocation();
        if (!position.ok) {
          toastError(position.reason);
          return;
        }
      }

      persist({ locationPrecision: choice }, "Location preference updated");
    });
  });
}
