# Elyra — Demo Walkthrough Script

**Length:** 60–90 seconds (target ~75s)
**Tone:** Calm, confident, investor-grade. Don't oversell the UI — *show the architecture through it*.
**Setup before you start:** Open `Final POC/ultimate.html` in a browser. Be at the top of the page (Hero). Have the Demo Cockpit (`#demo`) one scroll away.

---

## 0:00 — 0:08 · Open on the hero

**Click:** Nothing yet. Stay on the hero.

**Say:**
> "This is Elyra — a privacy-first connection platform for India's LGBTQIA+ community. The hero already shows our thesis: a public profile on the left, an AES-256-encrypted private layer on the right, and a live trust score of 91. Three things every dating app should have, none of them do."

---

## 0:08 — 0:18 · Onboarding (Step 1)

**Click:** `Start interactive demo` → lands on the Demo Cockpit. The rail shows step `1 / 5 · Onboarding`.

**Say:**
> "Onboarding captures identity *and* intent — separately. The user picks Exploring, Serious, Discreet, or Friendship. We don't force a photo, a real name, or a city pin. The product is opt-in to disclosure from screen one."

**Click:** Tap *Discreet* on the intent picker — the explanation card updates live.

---

## 0:18 — 0:32 · Pehchaan Layer (Step 2)

**Click:** Rail step `2 · Dual identity`.

**Say:**
> "This is the *Pehchaan Layer* — our dual-identity system. Public profile on the left: pronouns, intent, city only. Private profile on the right: real name, phone, address, ID — all AES-256-GCM encrypted."

**Click:** `Simulate consented reveal`. The lock animates open; encrypted fields decrypt to real values; the audit line updates to `Reveal logged · revocable`.

**Say:**
> "Every reveal is consented, audit-logged, and revocable. This is the architecture — not a setting."

---

## 0:32 — 0:45 · Explainable Matching (Step 3)

**Click:** Rail step `3 · Matching AI`. Candidate "Aarav · 92%" appears.

**Say:**
> "No swipe queue. Each candidate is an explainable card. The score is composed of 30% intent, 35% embedding similarity from a 384-dimension model, 20% distance, 15% preference fit — all visible to the user."

**Click:** `Generate next match`. A new candidate fills in with a fresh score and reasons.

**Say:**
> "Algorithmic transparency, by default. This will also pass the regulation that's coming."

---

## 0:45 — 0:58 · Visible AI Moderation (Step 4)

**Click:** Rail step `4 · Moderated chat`.

**Say:**
> "Chat with visible AI."

**Click:** In the composer, type or send the prefilled message: *"Can we keep location sharing inside Safe Date?"* Then send a second message containing the word *"phone"* or *"address"*.

**Say:**
> "The moment a sensitive personal field appears, the message blurs — reversibly. The reasoning console updates live: harassment, threat, personal-data scores, and the action taken. Users never feel silenced; they feel defended."

---

## 0:58 — 1:12 · Safe Date (Step 5)

**Click:** Rail step `5 · Safe Date`. Then `Start Safe Session`.

**Say:**
> "Safe Date is a first-class flow, not a settings page. Emergency contact, 15-minute check-ins, live route, and SOS."

**Click:** Watch the route pulse, the timer count down, then tap `Check in`.

**Say:**
> "Missed check-ins escalate automatically. This is the offline safety net no major dating app has ever shipped."

---

## 1:12 — 1:25 · Trust + Monetization (close)

**Click:** Scroll to `#trust` → tap `Recompute risk score`. The trust ring animates 0 → 91. Then scroll once more to `#business`.

**Say:**
> "Trust score is composite — verification, toxicity history, reports, fake-profile detection, account age. And here's the business model: free tier for adoption, ₹499 Plus, ₹999 Premium, ₹1999 Elite. We charge for *power* — boost, incognito, LLM starters — never for safety."

---

## 1:25 — 1:30 · Land the close

**Say:**
> "That's Elyra. Pehchaan Layer. India-first. Built for the people swipe apps were never built for. Trust is the next dating moat — we're building it."

---

## Delivery notes

- **Pace:** ~150 wpm. If you're racing, drop the second moderation send and the trust ring recompute — keep onboarding, identity reveal, matching, and Safe Date.
- **Eye contact > screen.** Look at the investor on each transition; the UI is doing the talking.
- **Do not apologize** for "this is a POC" or "the design isn't final". Speak as if it ships tomorrow — because architecturally, it does.
- **If asked "is this real?"** — *"Every interaction is local simulation, but every flow you see maps one-to-one to the production architecture in our build plan: FastAPI services, pgvector embeddings, Detoxify-style moderation, AES-256 private fields, and audited reveal events. Nothing here is decorative."*
- **If asked "what about safety abuse?"** — *"Risk-tiered rate limits, ML-flagged review queues, and human-in-the-loop on every Safe Date escalation. The reasoning trace you just saw is also our internal audit log."*
- **If asked "why hasn't an incumbent built this?"** — *"They'd cannibalize their core flow. Adding Pehchaan Layer means telling existing users their profiles were never private. We start clean."*
