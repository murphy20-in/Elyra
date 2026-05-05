# Elyra — Investor Pitch Deck

**Tagline:** *Pehchaan Layer · The Trust OS for identity-sensitive connection.*
**Round:** Seed · India-first launch
**Format:** 12 slides · 5-minute investor narrative

---

## Slide 1 — Title

**Elyra**
*When identity is sensitive, trust becomes the product.*

Pehchaan Layer · India-first · Privacy-first LGBTQIA+ connection

**Visual:** Hero phone mock from the POC — public profile card stacked over an AES-256 "Locked" private layer, with floating "Trust 91", "AI active", "Safe Date ready" pills.

**Speaker notes:**
> Hi, I'm building Elyra. Existing dating apps assume every user can be public. That assumption breaks for tens of millions of people in India — and across the world. Elyra is a privacy-first, AI-safety-native platform built for the people swipe apps were never built for. We're calling our core philosophy the *Pehchaan Layer* — identity, on the user's terms.

---

## Slide 2 — The Problem

**Dating products assume everyone can be public. They aren't.**

- **73%** of identity-sensitive users in India fear public exposure on swipe apps.
- **1 in 4** users encounter fake or unverified profiles before the first conversation.
- **0** mainstream dating products build offline safety — SOS, check-ins, emergency contacts — into the core loop.
- For LGBTQIA+ users in India, disclosure, harassment, fake profiles, and unsafe first meetings aren't edge cases. They're *adoption barriers*.

**Visual:** The three "problem cards" from the POC — `73%`, `1 in 4`, `0` — laid horizontally over a muted city backdrop.

**Speaker notes:**
> Public-by-default is a *feature* in San Francisco. In Mumbai, Lucknow, or Coimbatore, it's a *blocker*. People download swipe apps, hesitate at the photo upload, and bounce. The result is a community of millions left underserved — and a product category that has stopped innovating on the one thing that actually unlocks them: trust.

---

## Slide 3 — Why Now

**Three tailwinds converge in 2026.**

- **Identity is mainstream in India.** Pride, queer creators, and Section 377's reversal have moved LGBTQIA+ identity from invisible to digitally native — but product hasn't caught up.
- **Privacy is now a paid behavior.** Indian users pay for VPNs, vault apps, and incognito tiers. Willingness-to-pay for *privacy as a feature* is at an all-time high.
- **AI safety is finally cheap.** Open-weights moderation, embeddings, and on-device blur are now production-grade — what cost $50M in trust infra five years ago costs us a fraction today.

**Visual:** Three vertical timeline bars: *Identity → Privacy WTP → AI cost curve*, all converging on "2026 — Elyra".

**Speaker notes:**
> The same three forces that built Bumble in the US — cultural shift, willingness to pay, and platform unlock — are landing in India right now, but they're landing on a *different* user. The window to build the category-defining product for that user is open today.

---

## Slide 4 — The Solution

**Elyra is the Trust OS for modern connection.**

Six surfaces, one product:

1. **Pehchaan Layer** — dual identity. Public profile stays light; private fields stay AES-256-GCM encrypted, reveal-based, and audit-logged.
2. **Intent-based matching** — no swipe pressure. Users declare *Exploring · Serious · Discreet · Friendship*; we rank candidates with explainable AI.
3. **AI safety, visible** — toxicity scores, fake-profile detection, image moderation, and reasoning traces shown in-product.
4. **Privacy-first chat** — sensitive content auto-blurs (phone, address, location, home), reversibly and transparently.
5. **Safe Date** — emergency contact, timed check-ins, live route, SOS — first-class flow, not buried in settings.
6. **Premium privacy tiers** — incognito, boost, advanced filters, LLM starters as paid unlocks.

**Visual:** The four-card "feature strip" from the POC — *Dual Identity · Intent Matching · AI Safety · Safe Date* — with the chat and Safe Date panels behind in soft focus.

**Speaker notes:**
> We're not adding "trust" as a feature on top of a swipe app. We're *starting* from trust and building the connection layer on top. Every screen of the product surfaces who's safe, what's encrypted, and what the AI just decided — and *why*.

---

## Slide 5 — Product Demo (mapped to the POC)

**The full investor flow runs in under 90 seconds, on a single page.**

| Step | POC panel | What investors see |
|---|---|---|
| 1 | **Onboarding** | Step-based capture: display name, pronouns, intent picker (Exploring / Serious / Discreet / Friendship). No forced over-disclosure. |
| 2 | **Pehchaan Layer** | Public profile vs. AES-256-GCM private card. Tap the lock → simulated consented reveal → audit event written. |
| 3 | **Matching AI** | Candidate card scored 92% with the *explainability console*: 30% intent + 35% embedding + 20% distance + 15% preferences. |
| 4 | **Moderated chat** | Type "phone" / "address" / "location" / "home" → message blurs, reasoning trace updates live (toxicity, harassment, personal-data scores). |
| 5 | **Safe Date** | Pick a contact, set 15/30/60 min check-in, start a session — live route pulses, SOS armed. |

**Visual:** The five-step rail from the POC's Demo Cockpit, with arrows pointing to each panel screenshot.

**Speaker notes:**
> Everything you'll see in the live demo is the actual product surface — no placeholder screens, no Figma mocks. The rail on the left is the investor flow; click any step and you get the corresponding production-shaped UI, running locally.

---

## Slide 6 — Core Features (the moat in plain English)

- **Dual identity (Pehchaan Layer)** — *What other apps treat as a setting, we treat as the architecture.* AES-256-GCM, reveal-by-consent, audit trail. Revocable.
- **Explainable matching** — composite score with weights surfaced to the user. Builds trust *and* satisfies algorithmic-transparency regulation that's coming.
- **Visible AI moderation** — every chat decision shows category, toxicity, action, and a reversible "View anyway" path. Users never feel silenced; they feel *defended*.
- **Safe Date as a product, not a setting** — emergency contact, check-ins, SOS, live route, missed-check-in escalation. Moves safety from "user's problem" to "platform's promise".
- **Composite trust score** — verification + toxicity history + reports + fake-profile detector + account age, animated to 91 in the demo. One number that earns the right to charge.

**Visual:** The Trust dashboard ring at 91 + Risk reasoning panel from the POC.

**Speaker notes:**
> Each of these is, individually, a feature competitors *could* ship. The moat is that we ship them *together*, *visibly*, and *as the product surface itself*. That's a UX moat. And in a category where every app looks the same, UX is distribution.

---

## Slide 7 — Differentiation

**Why we win — and why no one else can copy this in a quarter.**

| Vector | Swipe apps (Tinder, Bumble, Hinge) | Niche queer apps | **Elyra** |
|---|---|---|---|
| Public-by-default | Yes (assumed) | Yes (mostly) | **No — Pehchaan Layer** |
| AI moderation | Off-screen, opaque | Light/none | **Visible, explainable, reversible** |
| Offline safety | Buried in help center | Absent | **Safe Date as core flow** |
| Identity model | Single profile | Single profile | **Dual identity, encrypted, audit-logged** |
| Matching | Swipe queue | Swipe queue | **No-swipe, explainable, intent-first** |
| India queer fit | Generic | Imported UX | **India-first, vernacular-ready** |

**The structural moat:** Trust is a *system*, not a feature. Replicating dual identity + AI safety + Safe Date + audit infrastructure is a 12–18 month rebuild for any incumbent — and it cannibalizes their existing product.

**Visual:** The comparison table above, rendered as a clean grid; Elyra column highlighted in coral.

**Speaker notes:**
> Tinder can't add Pehchaan Layer without telling 60 million users their profiles were never private. Grindr can't add Safe Date without admitting it should have been there for a decade. We don't have that cost. We start clean.

---

## Slide 8 — Market Opportunity

**India today. The world tomorrow.**

- **$2.5B** — projected India dating-app TAM by 2028.
- **2.5M+** — LGBTQIA+ digitally-active users in India who are *underserved* by current apps (per public estimates).
- **6×** — measured uplift in willingness-to-pay when privacy is the headline feature (privacy-tier benchmarks, India fintech & social).
- **Adjacent SAM:** identity-sensitive dating in MENA, SEA, LATAM — *every market with a privacy-aware queer middle class*.

**Phased expansion:**
- **Phase 1 (2026):** India web + mobile launch.
- **Phase 2 (2027):** SEA + MENA — markets where privacy is a survival feature.
- **Phase 3 (2028+):** EU + LATAM — privacy as a regulated standard.

**Visual:** The animated globe from the POC's Scale section — India lit, SEA + MENA pulsing, EU + LATAM in roadmap.

**Speaker notes:**
> India is our wedge — the user is acute, the WTP is real, the competition is asleep. But the *thesis* — that identity-sensitive users are an underserved global category — generalizes. We're building the playbook in India and porting it.

---

## Slide 9 — Business Model

**Privacy is the willingness-to-pay loop.**

| Tier | Price | Unlocks |
|---|---|---|
| **Free** | ₹0 | 5 likes/day, basic intent match, trust score visible, ads |
| **Plus** ★ | **₹499/mo** | Unlimited likes, see who liked you, no ads, priority moderation |
| **Premium** | ₹999/mo | Advanced filters, priority matching, **LLM conversation starters** |
| **Elite** | ₹1999/mo | **Boost · Incognito · Premium privacy · Priority human support** |

- **Annual:** 17% discount → improves LTV/CAC and lowers churn from monthly cycles.
- **Adjacent revenue:** paid verification badges (one-time), Safe Date concierge upsells, B2B partnerships with queer-friendly venues.
- **Unit economics target (Year 2):** ARPU ₹600/mo on paying tier, paying conversion 6–8% (privacy categories outperform 2× general dating), CAC payback ≤ 4 months.

**Visual:** The four pricing cards from the POC + the "Locked revenue" CTA strip (LLM starters, Incognito, See who liked you).

**Speaker notes:**
> Notice what's *paid* and what's *free*. Trust score, AI moderation, dual identity, Safe Date — all free. Those are the *adoption* engine. Boost, incognito, LLM starters, advanced filters — all paid. Those are the *retention* engine. We charge for power, not for safety.

---

## Slide 10 — Go-to-Market Strategy

**Land community-first. Convert through trust.**

1. **Partnerships, not paid ads (M0–M3).** Launch with queer creator collectives, pride orgs, and campus alliances in 8 metro & tier-1 cities. Earned reach > paid reach in identity-sensitive communities.
2. **Verified-creator referral loop (M3–M6).** Verified seed users invite their networks; each verified invite increases composite trust score — a *gamified, privacy-respecting* growth loop.
3. **Vernacular content + safety education (M6–M9).** Hindi/Tamil/Bengali content series on consent, safe meeting, and digital identity. Doubles as SEO and brand.
4. **Mobile launch + paid acquisition (M9–M12).** Expo-based mobile app, paid social with privacy-led creative, retention through Premium/Elite upsells.
5. **B2B & venue partnerships (M12+).** Safe-Date-friendly cafes and bars become a network effect. *"Meet at an Elyra-verified spot."*

**Visual:** A horizontal 12-month roadmap with the four phases color-coded; map of India dotted with launch cities.

**Speaker notes:**
> We're not buying users at $5 CPI like Bumble did in 2014. We're earning them through the people who already shape these communities — and the same trust mechanics that make the product safe make our growth loop *self-credentialing*.

---

## Slide 11 — Vision

**From a queer dating app in India to the world's Trust OS for connection.**

- **Y1:** India launch. Web + mobile. Pehchaan Layer is a household phrase in queer urban India.
- **Y2–3:** Expand to SEA & MENA. Dual identity becomes the *standard* for identity-sensitive markets.
- **Y3–5:** Open the Trust Layer as a platform — Pehchaan APIs powering identity-sensitive flows in fintech, healthcare, hiring, mental-health, and creator platforms. *Anywhere identity is sensitive, trust is the product.*
- **Y5+:** Global. Elyra is to identity-safe connection what Stripe became to payments — the invisible, default infrastructure.

**Visual:** A staircase graphic — Dating → Adjacent Connection (friendship, mentorship) → Identity Infrastructure platform.

**Speaker notes:**
> The dating app is the wedge. The real prize is being the *trust infrastructure* layer for any product where identity is sensitive. That's a category we get to define if we win the wedge — and the wedge is enormous on its own.

---

## Slide 12 — The Ask

**Raising seed to launch India and build the moat.**

**Raise:** Seed round.
**Use of funds:**
- **40% — Engineering.** Ship India web v1 (Next.js, deployed) and mobile v1 (Expo). Production-grade backend (FastAPI, PostgreSQL, MongoDB, Redis, pgvector) on Kubernetes with HPA + multi-region readiness.
- **25% — AI safety stack.** In-house toxicity, fake-profile, image-moderation, and embedding pipelines; reasoning-trace UX; reviewer queue + ML-flagged escalation.
- **20% — GTM.** Creator partnerships, verified-seed program, vernacular content, paid acquisition for mobile launch.
- **10% — Trust & compliance.** Legal, DPDP-ready privacy posture, SOC 2 path, on-call moderation.
- **5% — Reserve.**

**Milestones in 18 months:**
- Q1 '26 — India web launch, 25k seed users
- Q3 '26 — Mobile launch, paying tier live
- Q1 '27 — 250k MAU, 6%+ paying conversion, Series A readiness
- Q3 '27 — SEA/MENA pilot

**Visual:** The CTA card from the POC with the four metrics ($2.5B · 2.5M+ · 6× · Q1 '26) and a clean "Use of funds" donut.

**Speaker notes:**
> Trust is the next dating moat. Elyra is building it — India-first, privacy-defensible, AI-native, with a clear path from a wedge community to global infrastructure. We'd love your partnership for the round.
