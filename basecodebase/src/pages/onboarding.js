/**
 * Onboarding.
 *
 * Seven steps, each one either collecting something the matching engine
 * actually uses or explaining a privacy decision the user is about to
 * make. Progress persists to localStorage so a reload mid-flow resumes
 * rather than restarting, and every step after the first can go back.
 *
 * Copy discipline: the promises made here are ones a local-first app can
 * keep — you control what's shown, data stays on this device — and never
 * ones it can't, like server-side encryption.
 */

import { esc, html, raw, $, $$ } from "../utils/dom.js";
import { icon } from "../components/icons.js";
import { toastError } from "../components/toast.js";
import { navigate } from "../app/router.js";
import { INTENTS, LOCATION_PRECISION } from "../utils/config.js";
import { GENDER_IDENTITIES, ORIENTATIONS, PRONOUNS, INTEREST_POOL, CITIES } from "../data/seed.js";
import { emptyProfile } from "../services/profile.service.js";
import { profile as profileStore } from "../services/storage.service.js";
import {
  completeOnboarding, createLocalAccount, readOnboardingProgress, saveOnboardingProgress,
} from "../services/auth.service.js";
import { validatePublicProfile } from "../utils/validate.js";
import { ensureSeeded } from "../services/discovery.service.js";

const STEPS = ["welcome", "privacy", "identity", "intent", "preferences", "location", "about"];

let draft = emptyProfile();
let stepIndex = 0;

/* ------------------------------------------------------------------ */
/* Step renderers                                                      */
/* ------------------------------------------------------------------ */

const stepWelcome = () => html`
  <div class="ob-hero">
    <span class="ob-sigil">E</span>
    <h1>Your identity is <em class="accent">yours</em>.</h1>
    <p class="lede">
      Elyra is a connection app for India's LGBTQIA+ community. You decide what
      people see, and when. Let's set up a profile that fits how safe you need
      to be.
    </p>
    <ul class="ob-points">
      <li>${raw(icon("check"))} Takes about two minutes</li>
      <li>${raw(icon("check"))} No photo needed</li>
      <li>${raw(icon("check"))} Everything stays on this device</li>
    </ul>
  </div>`;

const stepPrivacy = () => html`
  <div class="ob-step">
    <h2>How privacy works here</h2>
    <p class="lede">Two layers, and you control the gate between them.</p>

    <div class="ob-cards">
      <div class="panel">
        <span class="icon-tile teal">${raw(icon("eye"))}</span>
        <h3>Public layer</h3>
        <p>Your name, age, city, interests and what you're looking for. This is what Discover shows other people.</p>
      </div>
      <div class="panel">
        <span class="icon-tile coral">${raw(icon("lock"))}</span>
        <h3>Private layer</h3>
        <p>Anything you'd rather hold back — full name, contact details, personal notes. Never shown in Discover.</p>
      </div>
    </div>

    <p class="ob-note">
      ${raw(icon("alert"))}
      <span>
        Being straight with you: this version stores everything in this browser
        on this device. It isn't synced or encrypted by us — that arrives with
        the Elyra backend. You can delete all of it at any time from Settings.
      </span>
    </p>
  </div>`;

const stepIdentity = () => html`
  <div class="ob-step">
    <h2>Tell us who you are</h2>
    <p class="lede">Only the name, age and city are required. Everything else is yours to skip.</p>

    <div class="form-grid">
      <div class="field">
        <label for="obName">Display name</label>
        <input id="obName" name="displayName" type="text" autocomplete="nickname"
               placeholder="What should people call you?" value="${draft.public.displayName}" />
        <span class="field-error" data-error="displayName"></span>
      </div>

      <div class="field">
        <label for="obAge">Age</label>
        <input id="obAge" name="age" type="number" inputmode="numeric" min="18" max="120"
               placeholder="18+" value="${draft.public.age ?? ""}" />
        <span class="field-error" data-error="age"></span>
      </div>

      <div class="field">
        <label for="obCity">City</label>
        <input id="obCity" name="city" type="text" list="cityList" autocomplete="address-level2"
               placeholder="Where are you based?" value="${draft.public.city}" />
        <datalist id="cityList">
          ${raw(CITIES.map((city) => `<option value="${esc(city)}"></option>`).join(""))}
        </datalist>
        <span class="field-error" data-error="city"></span>
      </div>

      <div class="field">
        <label for="obPronouns">Pronouns</label>
        <input id="obPronouns" name="pronouns" type="text" list="pronounList"
               placeholder="Optional" value="${draft.public.pronouns}" />
        <datalist id="pronounList">
          ${raw(PRONOUNS.map((p) => `<option value="${esc(p)}"></option>`).join(""))}
        </datalist>
      </div>

      <div class="field">
        <label for="obGender">Gender identity</label>
        <select id="obGender" name="genderIdentity">
          <option value="">Prefer not to say</option>
          ${raw(GENDER_IDENTITIES.map((g) =>
            `<option value="${esc(g)}"${draft.public.genderIdentity === g ? " selected" : ""}>${esc(g)}</option>`).join(""))}
        </select>
      </div>

      <div class="field">
        <label for="obOrientation">Orientation</label>
        <select id="obOrientation" name="orientation">
          <option value="">Prefer not to say</option>
          ${raw(ORIENTATIONS.map((o) =>
            `<option value="${esc(o)}"${draft.public.orientation === o ? " selected" : ""}>${esc(o)}</option>`).join(""))}
        </select>
      </div>
    </div>
  </div>`;

const stepIntent = () => html`
  <div class="ob-step">
    <h2>What are you here for?</h2>
    <p class="lede">This carries the most weight in matching — 30% of every score. You can change it whenever.</p>

    <div class="choice-grid" role="radiogroup" aria-label="Your intent">
      ${raw(INTENTS.map((intent) => `
        <button type="button" class="choice ${draft.public.intent === intent.id ? "is-selected" : ""}"
                role="radio" aria-checked="${draft.public.intent === intent.id}"
                data-intent="${esc(intent.id)}">
          <strong>${esc(intent.label)}</strong>
          <span>${esc(intent.blurb)}</span>
        </button>`).join(""))}
    </div>
    <span class="field-error" data-error="intent"></span>
  </div>`;

const stepPreferences = () => html`
  <div class="ob-step">
    <h2>Who would you like to meet?</h2>
    <p class="lede">Used to rank Discover. Nothing here is shown on your profile.</p>

    <div class="field">
      <label for="obAgeMin">Age range: <output id="obAgeOut">${draft.preferences.ageMin}–${draft.preferences.ageMax}</output></label>
      <div class="range-pair">
        <input id="obAgeMin" name="ageMin" type="range" min="18" max="80" value="${draft.preferences.ageMin}" />
        <input id="obAgeMax" name="ageMax" type="range" min="18" max="80" value="${draft.preferences.ageMax}" />
      </div>
    </div>

    <div class="field">
      <label for="obDistance">Maximum distance: <output id="obDistOut">${draft.preferences.maxDistanceKm} km</output></label>
      <input id="obDistance" name="maxDistanceKm" type="range" min="5" max="500" step="5"
             value="${draft.preferences.maxDistanceKm}" />
    </div>

    <fieldset class="field">
      <legend>Open to</legend>
      <div class="chip-choices">
        ${raw(GENDER_IDENTITIES.map((g) => `
          <button type="button" class="chip-choice ${draft.preferences.genderIdentities.includes(g) ? "is-selected" : ""}"
                  data-gender="${esc(g)}" aria-pressed="${draft.preferences.genderIdentities.includes(g)}">${esc(g)}</button>`).join(""))}
      </div>
      <p class="field-hint">Leave empty to stay open to everyone.</p>
    </fieldset>
  </div>`;

const stepLocation = () => html`
  <div class="ob-step">
    <h2>Location</h2>
    <p class="lede">
      Distance is 20% of a match score, so some location helps. You choose how
      precise — and we explain before ever asking the browser.
    </p>

    <div class="choice-list" role="radiogroup" aria-label="Location precision">
      ${raw(LOCATION_PRECISION.map((option) => `
        <button type="button" class="choice choice-row ${draft.privacy.locationPrecision === option.id ? "is-selected" : ""}"
                role="radio" aria-checked="${draft.privacy.locationPrecision === option.id}"
                data-location="${esc(option.id)}">
          <span class="choice-copy"><strong>${esc(option.label)}</strong><span>${esc(option.blurb)}</span></span>
          <span class="choice-tick">${icon("check")}</span>
        </button>`).join(""))}
    </div>

    <p class="ob-note">
      ${raw(icon("shield"))}
      <span>
        Your exact coordinates are never stored. "Precise" asks your browser for
        a one-time reading to estimate distance, and only after you tap it.
      </span>
    </p>
  </div>`;

const stepAbout = () => html`
  <div class="ob-step">
    <h2>A little about you</h2>
    <p class="lede">Shared interests drive 35% of a match score. Pick a few that are actually true.</p>

    <div class="field">
      <label for="obBio">Bio</label>
      <textarea id="obBio" name="bio" rows="4" maxlength="500"
                placeholder="What should someone know before they message you?">${draft.public.bio}</textarea>
      <p class="field-hint"><span id="obBioCount">${draft.public.bio.length}</span>/500</p>
    </div>

    <fieldset class="field">
      <legend>Interests <span class="field-hint">(up to 12)</span></legend>
      <div class="chip-choices">
        ${raw(INTEREST_POOL.map((interest) => `
          <button type="button" class="chip-choice ${draft.public.interests.includes(interest) ? "is-selected" : ""}"
                  data-interest="${esc(interest)}" aria-pressed="${draft.public.interests.includes(interest)}">${esc(interest)}</button>`).join(""))}
      </div>
      <span class="field-error" data-error="interests"></span>
    </fieldset>
  </div>`;

const RENDERERS = {
  welcome: stepWelcome, privacy: stepPrivacy, identity: stepIdentity,
  intent: stepIntent, preferences: stepPreferences, location: stepLocation, about: stepAbout,
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function collectIdentity() {
  const value = (id) => $(id)?.value?.trim() ?? "";
  draft.public.displayName = value("#obName");
  const age = $("#obAge")?.value;
  draft.public.age = age === "" ? null : Number(age);
  draft.public.city = value("#obCity");
  draft.public.pronouns = value("#obPronouns");
  draft.public.genderIdentity = $("#obGender")?.value ?? "";
  draft.public.orientation = $("#obOrientation")?.value ?? "";
}

function collectAbout() {
  draft.public.bio = $("#obBio")?.value ?? "";
}

/** Only validates the fields the current step is responsible for. */
function validateStep(name) {
  if (name === "identity") {
    collectIdentity();
    const errors = validatePublicProfile({ ...draft.public, intent: "serious" });
    delete errors.intent;
    delete errors.bio;
    delete errors.interests;
    return errors;
  }
  if (name === "intent") {
    return draft.public.intent ? {} : { intent: "Choose what you're here for." };
  }
  if (name === "about") {
    collectAbout();
    const errors = validatePublicProfile(draft.public);
    return Object.fromEntries(
      Object.entries(errors).filter(([key]) => ["bio", "interests"].includes(key))
    );
  }
  return {};
}

function showErrors(errors) {
  $$("[data-error]").forEach((node) => { node.textContent = ""; });
  for (const [field, message] of Object.entries(errors)) {
    const node = $(`[data-error="${field}"]`);
    if (node) node.textContent = message;
  }
  const first = Object.keys(errors)[0];
  if (first) {
    const input = $(`[name="${first}"]`);
    input?.focus();
    if (!input) toastError(errors[first]);
  }
}

async function finish() {
  await createLocalAccount();
  await profileStore.save({
    public: draft.public,
    private: draft.private,
    preferences: draft.preferences,
    privacy: draft.privacy,
  });
  await ensureSeeded();
  await completeOnboarding();
  navigate("/discover", { replace: true });
}

function paint(root) {
  const name = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  root.innerHTML = html`
    <div class="onboarding">
      <div class="ob-progress" role="progressbar" aria-valuemin="1"
           aria-valuemax="${STEPS.length}" aria-valuenow="${stepIndex + 1}"
           aria-label="Step ${stepIndex + 1} of ${STEPS.length}">
        ${raw(STEPS.map((_, i) =>
          `<span class="ob-tick ${i <= stepIndex ? "is-done" : ""}"></span>`).join(""))}
      </div>

      <div class="ob-panel">${raw(RENDERERS[name]())}</div>

      <div class="ob-actions">
        ${raw(isFirst ? "" : '<button type="button" class="btn btn-secondary" data-ob-back>Back</button>')}
        <button type="button" class="btn btn-primary btn-grow" data-ob-next>
          ${isLast ? "Finish and start" : isFirst ? "Get started" : "Continue"}
          <span class="action-arrow" aria-hidden="true">→</span>
        </button>
      </div>

      ${raw(isFirst ? "" : `<p class="ob-step-count">Step ${stepIndex + 1} of ${STEPS.length}</p>`)}
    </div>`;

  wire(root);
  root.querySelector(".ob-panel")?.scrollIntoView({ block: "start" });
}

function wire(root) {
  root.querySelector("[data-ob-next]")?.addEventListener("click", async () => {
    const name = STEPS[stepIndex];
    const errors = validateStep(name);
    if (Object.keys(errors).length > 0) {
      showErrors(errors);
      return;
    }
    if (name === "identity") collectIdentity();
    if (name === "about") collectAbout();

    if (stepIndex === STEPS.length - 1) {
      await finish();
      return;
    }
    stepIndex += 1;
    saveOnboardingProgress(stepIndex, draft);
    paint(root);
  });

  root.querySelector("[data-ob-back]")?.addEventListener("click", () => {
    if (STEPS[stepIndex] === "identity") collectIdentity();
    if (STEPS[stepIndex] === "about") collectAbout();
    stepIndex = Math.max(0, stepIndex - 1);
    saveOnboardingProgress(stepIndex, draft);
    paint(root);
  });

  root.querySelectorAll("[data-intent]").forEach((button) => {
    button.addEventListener("click", () => {
      draft.public.intent = button.dataset.intent;
      paint(root);
    });
  });

  root.querySelectorAll("[data-location]").forEach((button) => {
    button.addEventListener("click", () => {
      draft.privacy.locationPrecision = button.dataset.location;
      paint(root);
    });
  });

  root.querySelectorAll("[data-interest]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.interest;
      const list = draft.public.interests;
      const at = list.indexOf(value);
      if (at === -1) {
        if (list.length >= 12) {
          showErrors({ interests: "Pick up to 12 interests." });
          return;
        }
        list.push(value);
      } else list.splice(at, 1);

      button.classList.toggle("is-selected");
      button.setAttribute("aria-pressed", String(at === -1));
      $('[data-error="interests"]').textContent = "";
    });
  });

  root.querySelectorAll("[data-gender]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.gender;
      const list = draft.preferences.genderIdentities;
      const at = list.indexOf(value);
      if (at === -1) list.push(value);
      else list.splice(at, 1);
      button.classList.toggle("is-selected");
      button.setAttribute("aria-pressed", String(at === -1));
    });
  });

  // Keep the two range thumbs from crossing over each other
  const min = $("#obAgeMin");
  const max = $("#obAgeMax");
  const out = $("#obAgeOut");
  const syncAges = () => {
    let lo = Number(min.value);
    let hi = Number(max.value);
    if (lo > hi) [lo, hi] = [hi, lo];
    draft.preferences.ageMin = lo;
    draft.preferences.ageMax = hi;
    out.textContent = `${lo}–${hi}`;
  };
  min?.addEventListener("input", syncAges);
  max?.addEventListener("input", syncAges);

  const distance = $("#obDistance");
  distance?.addEventListener("input", () => {
    draft.preferences.maxDistanceKm = Number(distance.value);
    $("#obDistOut").textContent = `${distance.value} km`;
  });

  const bio = $("#obBio");
  bio?.addEventListener("input", () => {
    $("#obBioCount").textContent = String(bio.value.length);
  });
}

export function renderOnboarding(root) {
  const saved = readOnboardingProgress();
  if (saved?.draft) {
    draft = { ...emptyProfile(), ...saved.draft };
    stepIndex = Math.min(saved.step ?? 0, STEPS.length - 1);
  }
  document.body.dataset.chrome = "bare";
  paint(root);
}

export const __testing = { STEPS, validateStep, setDraft: (d) => { draft = d; } };
