# Elyra — Progressive Web App

A privacy-first connection app for India's LGBTQIA+ community, built as an
installable, offline-capable PWA that runs entirely in the browser.

This is the deployable client. The FastAPI/Postgres/Redis reference stack
lives in [`../codebase`](../codebase) and is untouched by this build.

> `basecodebase/web/` holds the earlier static marketing landing page built
> before this PWA. It is superseded — its design language and copy carried
> forward into `src/styles/` and onboarding — and it is excluded from the
> build, the linter and the deployed artifact. Delete it whenever you like.

---

## What this is

A **static** Progressive Web App. No server, no database, no API. Everything
you create — profile, matches, conversations, safety records — is stored in
**your browser on your device**, using IndexedDB.

That constraint is deliberate: GitHub Pages can only serve static files, so
rather than simulate a backend and imply guarantees it cannot keep, the app
does the honest version of each feature and labels the boundary wherever a
real backend would be required. See
[Static-mode limitations](#static-mode-limitations).

---

## Quick start

```bash
cd basecodebase
npm install
npm run dev          # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR (service worker disabled — it fights HMR) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` at http://localhost:4173 |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright; builds and previews first) |
| `npm run lint` | ESLint |
| `npm run check` | lint + unit tests + build |

The service worker only exists in a production build, so test install and
offline behaviour against `npm run build && npm run preview`, not `dev`.

---

## Architecture

```
UI (pages/, components/)
      ↓
Application state (store/)
      ↓
Services (services/)          ← domain logic; the only layer pages talk to
      ↓
Adapters (adapters/)          ← local.adapter.js  |  api.adapter.js
      ↓
IndexedDB  |  (future) Elyra backend
```

```
basecodebase/
├── index.html                 App shell
├── vite.config.js             Build + PWA/manifest/service-worker config
├── public/
│   ├── 404.html               GitHub Pages fallback
│   ├── favicon.ico
│   ├── robots.txt
│   └── icons/                 Manifest icons, incl. maskable
├── src/
│   ├── main.js                Boot, routes, route guard, install nudge
│   ├── app/
│   │   ├── router.js          Hash router
│   │   ├── shell.js           Sidebar / top bar / bottom tab bar
│   │   └── pwa.js             Service-worker lifecycle, install prompt
│   ├── adapters/
│   │   ├── local.adapter.js   IndexedDB — the active adapter
│   │   └── api.adapter.js     Backend contract; inert until configured
│   ├── services/              auth · profile · discovery · matching · chat · safety · storage
│   ├── store/store.js         Small observable app state
│   ├── components/            icons · toast · dialog · avatar · states · profile-card
│   ├── pages/                 onboarding · discover · matches · chats · profile · privacy · safety · settings · premium
│   ├── utils/                 db · dom · id · format · validate · moderation · config
│   ├── data/seed.js           Fictional demo population
│   └── styles/                tokens · base · shell · components · pages
└── tests/
    ├── unit/                  105 tests (Vitest + fake-indexeddb)
    └── e2e/                   22 tests × 2 devices (Playwright)
```

### Why a hash router

GitHub Pages cannot rewrite unknown paths to `index.html`. Under the History
API, refreshing or sharing `/elyra/chats/abc` asks the host for a file that
does not exist; the usual workaround bounces through `404.html` and a query
string, which mangles URLs and breaks the back button.

With a hash, every route resolves to `index.html` at whatever path the site
is served from. Deep links, refresh and bookmarks work with no host
cooperation and no configured repository name.

### Why `base: "./"`

All emitted asset URLs are relative, so one build artifact works unchanged at
a domain root, at `https://<user>.github.io/<any-repo>/`, or in a
subdirectory — without anyone configuring the repo name. Override with
`VITE_BASE` if you need absolute paths.

---

## PWA

- **Manifest** — `standalone`, portrait, themed, with 192/512 icons plus
  maskable variants for adaptive launchers. `start_url` and `scope` are
  relative so a subpath deploy installs correctly.
- **Service worker** — Workbox via `vite-plugin-pwa`. Precaches the app
  shell (24 entries), versioned with outdated-cache cleanup, Google Fonts
  cached at runtime.
- **Updates are prompted, not silent.** Swapping the running app underneath
  someone mid-conversation is worse than a reload banner, so the new worker
  waits until the user taps **Reload**.

### Installing

**Android / Chrome / Edge** — use the install button in Settings → App, or
the prompt that appears after you have used the app for a while. Dismissal
is remembered, so it will not ask twice.

**iOS / Safari** — Safari has no install API. Tap **Share → Add to Home
Screen**. Settings → App shows these instructions on iOS.

### Offline

Once installed (or simply once visited), the app opens and stays usable with
no network: profile, matches, conversations, drafts, safety settings and the
discovery deck all read from local storage. An unobtrusive banner marks the
offline state.

`navigator.onLine` is not trusted on its own — after a service-worker-served
reload Chromium reports a page as online even when it is not — so
connectivity is confirmed with a small cache-busting request.

---

## Local data

| Store | Contents |
| --- | --- |
| **IndexedDB** (`elyra`) | Profile, candidates, likes, matches, conversations, messages, reports, blocks, Safe Date sessions, trusted contacts, settings, activity |
| **localStorage** (`elyra:` prefix) | Session flag, onboarding progress, install-prompt dismissal, small preferences |

Manage it in **Settings → Storage**:

- **Export** — full JSON snapshot. It contains your profile and message
  history in plain text; the UI warns you before downloading.
- **Import** — replaces everything after confirmation. Rejects foreign files
  and snapshots from a different schema version.
- **Reset demo data** — clears everything and restores the demo population.
- **Delete all local data** — erases IndexedDB, our `localStorage` keys and
  the app's caches, then returns to onboarding. Double-confirmed and
  irreversible.

Clearing browser data for the site removes all of it too.

---

## Static-mode limitations

Each of these is labelled in the UI where it appears, not hidden here.

| Not available | Why | What the app does instead |
| --- | --- | --- |
| **Authentication** | No server to verify a credential against | A local account. No password screen is shown, and nothing claims to be secure sign-in. |
| **Real multi-user chat** | No server, no second participant | Replies are generated on your device. The chat header says so on every thread. |
| **AI moderation** | The production model is a server-side service | A small local pattern check. It flags a message and lets you send anyway, edit or cancel — and states it is not the production model. |
| **Reports reaching moderators** | Nowhere to send them | Reports are stored locally and marked `recorded-locally`. Blocking, which is the action that actually protects you, is immediate and real. |
| **Emergency SMS / automatic SOS** | A browser cannot send an SMS or place a call unattended | Safe Date runs a real countdown and check-ins. Emergency actions hand off to your phone via `tel:` and the Web Share sheet, and report honestly when a handoff is unavailable. |
| **Payments** | Card handling and verification must be server-side | Plans are presented as UI only. No card details are collected and no payment key is embedded. |
| **Push notifications** | Push needs a server to send from | The toggle is disabled and explains why. |
| **Server-side encryption of private fields** | AES-256 at rest is a property of the backend | The private layer is a genuine product boundary — never shown in Discover or to matches — but the privacy dashboard states plainly that it is separation, not encryption. |
| **Face verification** | Runs on the backend AI services | Verified badges appear only on demo profiles, and Premium says verification is unavailable here. |

**What is real:** persistence across reloads, the matching engine and its
score breakdown, blocking, the Safe Date timer, install, offline, and every
storage-management action.

---

## Matching

Scores follow the documented Elyra model:

```
embedding similarity 35%  ·  intent 30%  ·  distance 20%  ·  preferences 15%
```

In local mode the similarity term is a deterministic interest-overlap
approximation — the browser is not running pgvector or a sentence encoder,
and the compatibility panel says so. The weighting and the shape of the
result match what the backend returns, so `api.adapter.js` can supply real
scores without the Discover UI changing.

Every score is explained: tap the percentage on a card for the per-component
breakdown and the reasons behind it.

---

## Deploying to GitHub Pages

1. Push to `main`. `.github/workflows/deploy.yml` lints, unit-tests, builds,
   runs the E2E suite, and publishes `basecodebase/dist`.
2. In the repository: **Settings → Pages → Build and deployment → Source:
   GitHub Actions**.
3. The app appears at `https://<github-username>.github.io/<repository-name>/`.

No configuration of the repository name is needed — asset paths are relative
and the router uses the hash, so the same artifact works at any path.

```bash
git add .
git commit -m "Build Elyra PWA"
git push
```

To verify a subpath deploy locally before pushing:

```bash
npm run build
mkdir -p /tmp/pages/<repository-name> && cp -r dist/* /tmp/pages/<repository-name>/
cd /tmp/pages && python3 -m http.server 4890
# http://localhost:4890/<repository-name>/
```

---

## Connecting the real backend

`src/adapters/api.adapter.js` defines the contract and lists the endpoints it
maps to in [`../codebase/app/backend`](../codebase/app/backend) (mounted at
`/api/v1`). It deliberately throws rather than calling anything: pointing a
static build at imaginary endpoints produces a UI that looks connected and
is not.

To switch over:

1. Implement `request()` — auth headers, refresh-on-401, and unwrapping
   FastAPI's `{ detail: { detail, error_code } }` error shape.
2. Fill in the exported groups (`auth`, `profile`, `matches`, `chat`,
   `safety`, `payments`, `notifications`), plus `realtime` for WebSocket
   chat and `ai` for the embedding / moderation / image / fake-profile
   services, which stay separate boundaries rather than one "AI" call.
3. Build with `VITE_DATA_MODE=api` and `VITE_API_BASE_URL=https://…`.

Nothing above the adapter changes: `services/storage.service.js` is the only
module that knows which adapter is active, and the UI never asks.

Note that an API-mode build is no longer a static site in spirit — it needs a
reachable backend, CORS, and a place to hold secrets. GitHub Pages remains
suitable only for the local-mode build.

---

## Testing

```bash
npm test           # 105 unit tests
npm run test:e2e   # 44 end-to-end tests (desktop + mobile viewports)
```

Unit tests cover the matching engine (including that the weights sum to 1),
the safety filter (including that it does *not* flag ordinary identity
vocabulary), profile validation, the hash router, IndexedDB persistence and
export/import, blocking, Safe Date, discovery and chat.

E2E covers the full journey — onboarding → discover → like → match → chat →
reload-and-persist — plus the moderation prompt, blocking, privacy
persistence, profile editing, Safe Date, reset, deep links, manifest
validity, service-worker registration, offline operation, relative asset
paths, keyboard access, dialog focus, accessible names, and horizontal
overflow at seven viewport widths from 320px up.

E2E runs against the production preview build, because the service worker
and the real asset graph only exist after a build.

---

## Security notes

No secrets are committed, and none can be: a static client cannot hold one.
No API keys, no payment keys, no LLM credentials. `VITE_*` variables are
inlined into the bundle at build time and are therefore public by
definition — never put a secret in one.

User-supplied text (bios, messages, interests) is HTML-escaped by default:
`utils/dom.js` exposes an escaping tagged template, and bypassing it requires
an explicit `raw()` call.
