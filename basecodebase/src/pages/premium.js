/**
 * Premium plans.
 *
 * Presentational only, and explicitly so. Card details are never
 * collected, no payment SDK is loaded, and no key is embedded — real
 * payments have to be initiated and verified server-side, which a static
 * site cannot do. Selecting a plan records interest locally and says
 * exactly that.
 */

import { html, raw, esc, $$ } from "../utils/dom.js";
import { icon } from "../components/icons.js";
import { toast } from "../components/toast.js";
import { setTopbar } from "../app/shell.js";
import { settings } from "../services/storage.service.js";

const PLANS = [
  {
    id: "free", name: "Free", price: "₹0", cadence: "forever",
    blurb: "Every safety feature, permanently.",
    features: [
      "Dual-layer profile", "Intent-based matching", "Local safety filter",
      "Safe Date check-ins", "Blocking and reporting",
    ],
  },
  {
    id: "plus", name: "Plus", price: "₹499", cadence: "per month", featured: true,
    blurb: "For meeting more of the right people.",
    features: [
      "Everything in Free", "Unlimited matches", "See who liked you",
      "Verified badge", "Travel mode",
    ],
  },
  {
    id: "private", name: "Private", price: "₹899", cadence: "per month",
    blurb: "Maximum control over your footprint.",
    features: [
      "Everything in Plus", "Incognito browsing", "Block by contact list",
      "Disappearing messages", "Priority human support",
    ],
  },
];

export async function renderPremium(root) {
  setTopbar({ title: "Premium", back: "/settings" });

  const stored = await settings.all();
  const interested = stored.planInterest ?? null;

  root.innerHTML = html`
    <div class="page page-premium">
      <div class="panel tone-note">
        ${raw(icon("alert"))}
        <p>
          These plans aren't purchasable in this build. Payments must be created
          and verified on a server — a static site has no way to hold a key
          safely or confirm a transaction, so there's no checkout here to
          mislead you with.
        </p>
      </div>

      <div class="plan-grid">
        ${raw(PLANS.map((plan) => `
          <article class="panel plan ${plan.featured ? "is-featured" : ""}">
            ${plan.featured ? '<span class="plan-badge">Most chosen</span>' : ""}
            <h3>${esc(plan.name)}</h3>
            <p class="muted">${esc(plan.blurb)}</p>
            <p class="plan-price">${esc(plan.price)}<small>/${esc(plan.cadence)}</small></p>
            <ul class="plan-features">
              ${plan.features.map((feature) => `<li>${icon("check")} ${esc(feature)}</li>`).join("")}
            </ul>
            <button type="button" class="btn ${plan.featured ? "btn-primary" : "btn-secondary"} btn-grow"
                    data-plan="${esc(plan.id)}" ${plan.id === "free" ? "disabled" : ""}>
              ${plan.id === "free" ? "Your current plan" : interested === plan.id ? "Interest noted" : "Register interest"}
            </button>
          </article>`).join(""))}
      </div>

      <section class="panel">
        <h3 class="section-label">${raw(icon("shieldCheck"))} Verification</h3>
        <p class="muted">
          Elyra's verification is a liveness check that confirms a person is
          real without publishing their face. It runs on the AI services in the
          backend, so it's unavailable here.
        </p>
      </section>
    </div>`;

  $$("[data-plan]", root).forEach((button) => {
    button.addEventListener("click", async () => {
      await settings.set("planInterest", button.dataset.plan);
      toast("Interest noted locally. No payment was taken and no card details were requested.");
      renderPremium(root);
    });
  });
}
