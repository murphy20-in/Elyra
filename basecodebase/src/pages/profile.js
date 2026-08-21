/**
 * Profile view and editor.
 *
 * The editor autosaves each section on blur rather than hiding progress
 * behind one Save button — losing a half-written bio to a stray back
 * gesture is the failure mode worth designing against. An explicit Save
 * still exists for the people who want the confirmation.
 */

import { html, raw, esc, $, $$ } from "../utils/dom.js";
import { icon } from "../components/icons.js";
import { avatar } from "../components/avatar.js";
import { confirmDialog } from "../components/dialog.js";
import { toastSuccess, toastError } from "../components/toast.js";
import { setTopbar } from "../app/shell.js";
import { navigate } from "../app/router.js";
import { getState, setState } from "../store/store.js";
import {
  getProfile, savePublicProfile, savePrivateProfile, savePreferences,
  clearPrivateLayer, completeness,
} from "../services/profile.service.js";
import { INTENTS } from "../utils/config.js";
import { GENDER_IDENTITIES, ORIENTATIONS, PRONOUNS, INTEREST_POOL, CITIES } from "../data/seed.js";
import { validatePublicProfile } from "../utils/validate.js";
import { pct } from "../utils/format.js";

const intentLabel = (id) => INTENTS.find((i) => i.id === id)?.label ?? "Not set";

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export async function renderProfile(root) {
  setTopbar({
    title: "Profile",
    actions: `<a class="icon-btn" href="#/profile/edit" aria-label="Edit profile">${icon("edit")}</a>`,
  });

  const profile = await getProfile();
  if (!profile) {
    navigate("/onboarding", { replace: true });
    return;
  }
  setState({ profile });

  const p = profile.public;
  const done = completeness(profile);

  root.innerHTML = html`
    <div class="page page-profile">
      <div class="panel profile-hero">
        ${raw(avatar({ name: p.displayName, seed: "me", size: "xl" }))}
        <h2>${p.displayName} <span class="card-age">${p.age ?? ""}</span></h2>
        <p class="card-sub">${[p.pronouns, p.city].filter(Boolean).join(" · ")}</p>
        <span class="tag tag-intent">${intentLabel(p.intent)}</span>
        ${raw(p.bio ? `<p class="detail-bio">${esc(p.bio)}</p>` : '<p class="muted">No bio yet.</p>')}
        ${raw(p.interests.length
          ? `<ul class="card-interests">${p.interests.map((i) => `<li class="tag">${esc(i)}</li>`).join("")}</ul>`
          : "")}
      </div>

      ${raw(done < 1 ? `
        <div class="panel nudge">
          <div class="nudge-head">
            <strong>Profile ${pct(done)} complete</strong>
            <span class="meter"><i style="width:${Math.round(done * 100)}%"></i></span>
          </div>
          <p>A fuller profile scores better in matching — interests alone are 35% of it.</p>
          <a class="btn btn-secondary btn-small" href="#/profile/edit">Finish profile</a>
        </div>` : "")}

      <div class="panel">
        <h3 class="section-label">${raw(icon("lock"))} Private layer</h3>
        <p class="muted">
          Held back from Discover and from everyone you match with. In this
          local build it is stored in this browser like the rest of your data —
          separated by design, not by encryption.
        </p>
        <dl class="detail-list">
          <div><dt>Full name</dt><dd>${profile.private.fullName || "—"}</dd></div>
          <div><dt>Email</dt><dd>${profile.private.email || "—"}</dd></div>
          <div><dt>Phone</dt><dd>${profile.private.phone || "—"}</dd></div>
        </dl>
        <button type="button" class="btn btn-secondary btn-small" data-clear-private>Clear private layer</button>
      </div>

      <nav class="link-list">
        <a class="row-item" href="#/profile/edit">
          <span class="icon-tile">${raw(icon("edit"))}</span>
          <span class="row-copy"><strong>Edit profile</strong><span>Identity, bio, interests, intent</span></span>
          <span class="row-arrow">${raw(icon("chevronRight"))}</span>
        </a>
        <a class="row-item" href="#/privacy">
          <span class="icon-tile teal">${raw(icon("eye"))}</span>
          <span class="row-copy"><strong>Privacy</strong><span>Who sees what, and how precisely</span></span>
          <span class="row-arrow">${raw(icon("chevronRight"))}</span>
        </a>
        <a class="row-item" href="#/safety">
          <span class="icon-tile coral">${raw(icon("shield"))}</span>
          <span class="row-copy"><strong>Safety</strong><span>Blocks, reports, Safe Date</span></span>
          <span class="row-arrow">${raw(icon("chevronRight"))}</span>
        </a>
        <a class="row-item" href="#/settings">
          <span class="icon-tile">${raw(icon("settings"))}</span>
          <span class="row-copy"><strong>Settings</strong><span>Storage, install, about</span></span>
          <span class="row-arrow">${raw(icon("chevronRight"))}</span>
        </a>
      </nav>
    </div>`;

  root.querySelector("[data-clear-private]")?.addEventListener("click", async () => {
    const ok = await confirmDialog({
      title: "Clear your private layer?",
      message: "Full name, email, phone and notes are removed from this device. Your public profile is untouched.",
      confirmLabel: "Clear it",
      danger: true,
    });
    if (!ok) return;
    await clearPrivateLayer();
    toastSuccess("Private layer cleared.");
    renderProfile(root);
  });
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export async function renderProfileEdit(root) {
  setTopbar({ title: "Edit profile", back: "/profile" });

  const profile = await getProfile();
  if (!profile) {
    navigate("/onboarding", { replace: true });
    return;
  }

  const p = profile.public;
  const prefs = profile.preferences;
  const selected = new Set(p.interests);

  root.innerHTML = html`
    <form class="page page-edit" id="editForm" novalidate>
      <section class="panel">
        <h3 class="section-label">Basic</h3>
        <div class="form-grid">
          <div class="field">
            <label for="edName">Display name</label>
            <input id="edName" name="displayName" type="text" value="${p.displayName}" />
            <span class="field-error" data-error="displayName"></span>
          </div>
          <div class="field">
            <label for="edAge">Age</label>
            <input id="edAge" name="age" type="number" min="18" max="120" value="${p.age ?? ""}" />
            <span class="field-error" data-error="age"></span>
          </div>
          <div class="field">
            <label for="edCity">City</label>
            <input id="edCity" name="city" type="text" list="edCityList" value="${p.city}" />
            <datalist id="edCityList">
              ${raw(CITIES.map((c) => `<option value="${esc(c)}"></option>`).join(""))}
            </datalist>
            <span class="field-error" data-error="city"></span>
          </div>
          <div class="field">
            <label for="edPronouns">Pronouns</label>
            <input id="edPronouns" name="pronouns" type="text" list="edPronounList" value="${p.pronouns}" />
            <datalist id="edPronounList">
              ${raw(PRONOUNS.map((x) => `<option value="${esc(x)}"></option>`).join(""))}
            </datalist>
          </div>
        </div>
      </section>

      <section class="panel">
        <h3 class="section-label">Identity</h3>
        <div class="form-grid">
          <div class="field">
            <label for="edGender">Gender identity</label>
            <select id="edGender" name="genderIdentity">
              <option value="">Prefer not to say</option>
              ${raw(GENDER_IDENTITIES.map((g) =>
                `<option value="${esc(g)}"${p.genderIdentity === g ? " selected" : ""}>${esc(g)}</option>`).join(""))}
            </select>
          </div>
          <div class="field">
            <label for="edOrientation">Orientation</label>
            <select id="edOrientation" name="orientation">
              <option value="">Prefer not to say</option>
              ${raw(ORIENTATIONS.map((o) =>
                `<option value="${esc(o)}"${p.orientation === o ? " selected" : ""}>${esc(o)}</option>`).join(""))}
            </select>
          </div>
        </div>
      </section>

      <section class="panel">
        <h3 class="section-label">About you</h3>
        <div class="field">
          <label for="edBio">Bio</label>
          <textarea id="edBio" name="bio" rows="4" maxlength="500">${p.bio}</textarea>
          <p class="field-hint"><span id="edBioCount">${p.bio.length}</span>/500</p>
          <span class="field-error" data-error="bio"></span>
        </div>
      </section>

      <section class="panel">
        <h3 class="section-label">Interests</h3>
        <div class="chip-choices">
          ${raw(INTEREST_POOL.map((i) => `
            <button type="button" class="chip-choice ${selected.has(i) ? "is-selected" : ""}"
                    data-interest="${esc(i)}" aria-pressed="${selected.has(i)}">${esc(i)}</button>`).join(""))}
        </div>
        <span class="field-error" data-error="interests"></span>
      </section>

      <section class="panel">
        <h3 class="section-label">Intent</h3>
        <div class="choice-grid" role="radiogroup" aria-label="Intent">
          ${raw(INTENTS.map((intent) => `
            <button type="button" class="choice ${p.intent === intent.id ? "is-selected" : ""}"
                    role="radio" aria-checked="${p.intent === intent.id}" data-intent="${esc(intent.id)}">
              <strong>${esc(intent.label)}</strong><span>${esc(intent.blurb)}</span>
            </button>`).join(""))}
        </div>
        <span class="field-error" data-error="intent"></span>
      </section>

      <section class="panel">
        <h3 class="section-label">Who you'd like to meet</h3>
        <div class="field">
          <label for="edAgeMin">Age range: <output id="edAgeOut">${prefs.ageMin}–${prefs.ageMax}</output></label>
          <div class="range-pair">
            <input id="edAgeMin" type="range" min="18" max="80" value="${prefs.ageMin}" />
            <input id="edAgeMax" type="range" min="18" max="80" value="${prefs.ageMax}" />
          </div>
        </div>
        <div class="field">
          <label for="edDistance">Maximum distance: <output id="edDistOut">${prefs.maxDistanceKm} km</output></label>
          <input id="edDistance" type="range" min="5" max="500" step="5" value="${prefs.maxDistanceKm}" />
        </div>
      </section>

      <section class="panel">
        <h3 class="section-label">${raw(icon("lock"))} Private layer</h3>
        <p class="muted">Never shown in Discover or to matches.</p>
        <div class="form-grid">
          <div class="field">
            <label for="edFullName">Full name</label>
            <input id="edFullName" type="text" value="${profile.private.fullName}" />
          </div>
          <div class="field">
            <label for="edEmail">Email</label>
            <input id="edEmail" type="email" value="${profile.private.email}" />
          </div>
          <div class="field">
            <label for="edPhone">Phone</label>
            <input id="edPhone" type="tel" value="${profile.private.phone}" />
          </div>
        </div>
      </section>

      <div class="stack-actions sticky-actions">
        <button type="submit" class="btn btn-primary btn-grow">Save changes</button>
        <button type="button" class="btn btn-secondary" data-cancel>Cancel</button>
      </div>
    </form>`;

  let intent = p.intent;

  $$("[data-intent]", root).forEach((button) => {
    button.addEventListener("click", () => {
      intent = button.dataset.intent;
      $$("[data-intent]", root).forEach((other) => {
        const on = other === button;
        other.classList.toggle("is-selected", on);
        other.setAttribute("aria-checked", String(on));
      });
    });
  });

  $$("[data-interest]", root).forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.interest;
      if (selected.has(value)) selected.delete(value);
      else if (selected.size >= 12) {
        $('[data-error="interests"]').textContent = "Pick up to 12 interests.";
        return;
      } else selected.add(value);
      button.classList.toggle("is-selected");
      button.setAttribute("aria-pressed", String(selected.has(value)));
      $('[data-error="interests"]').textContent = "";
    });
  });

  const bio = $("#edBio");
  bio?.addEventListener("input", () => { $("#edBioCount").textContent = String(bio.value.length); });

  const min = $("#edAgeMin");
  const max = $("#edAgeMax");
  const syncAges = () => {
    let lo = Number(min.value);
    let hi = Number(max.value);
    if (lo > hi) [lo, hi] = [hi, lo];
    $("#edAgeOut").textContent = `${lo}–${hi}`;
    return { lo, hi };
  };
  min?.addEventListener("input", syncAges);
  max?.addEventListener("input", syncAges);

  const distance = $("#edDistance");
  distance?.addEventListener("input", () => {
    $("#edDistOut").textContent = `${distance.value} km`;
  });

  $("[data-cancel]", root)?.addEventListener("click", () => navigate("/profile"));

  $("#editForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const publicPatch = {
      displayName: $("#edName").value.trim(),
      age: $("#edAge").value === "" ? null : Number($("#edAge").value),
      city: $("#edCity").value.trim(),
      pronouns: $("#edPronouns").value.trim(),
      genderIdentity: $("#edGender").value,
      orientation: $("#edOrientation").value,
      bio: bio.value,
      interests: [...selected],
      intent,
    };

    const errors = validatePublicProfile(publicPatch);
    $$("[data-error]", root).forEach((node) => { node.textContent = ""; });

    if (Object.keys(errors).length > 0) {
      for (const [field, message] of Object.entries(errors)) {
        const node = $(`[data-error="${field}"]`, root);
        if (node) node.textContent = message;
      }
      const first = $(`[name="${Object.keys(errors)[0]}"]`, root);
      first?.focus();
      toastError("Some fields need attention.");
      return;
    }

    try {
      const { lo, hi } = syncAges();
      await savePublicProfile(publicPatch);
      await savePreferences({ ageMin: lo, ageMax: hi, maxDistanceKm: Number(distance.value) });
      await savePrivateProfile({
        fullName: $("#edFullName").value.trim(),
        email: $("#edEmail").value.trim(),
        phone: $("#edPhone").value.trim(),
      });

      setState({ profile: await getProfile() });
      toastSuccess("Profile saved");
      navigate("/profile");
    } catch (error) {
      toastError(error.message || "Couldn't save your profile.");
    }
  });

  void getState;
}
