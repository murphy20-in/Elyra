# Phase 6: Frontend

> **Goal**: Build the complete Next.js 14 frontend with Tailwind CSS, covering all pages, components, API integration, WebSocket chat, state management, and responsive design.

---

## 6.1 Project Setup

### Initialize Next.js
```bash
npx -y create-next-app@14 ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### Additional Dependencies
```bash
# Core state / network
npm install zustand axios socket.io-client framer-motion

# UI
npm install @heroicons/react lucide-react react-hot-toast date-fns

# Maps (safety/live location)
npm install react-leaflet leaflet
npm install -D @types/leaflet

# i18n (en + hi)
npm install next-intl

# PWA
npm install next-pwa

# Observability
npm install @sentry/nextjs

# Testing
npm install -D @playwright/test

# Types
npm install -D @types/node @types/react
```

### Tailwind Config (`tailwind.config.ts`)
```typescript
// Custom theme extending Tailwind with Elyra brand colors:
// Primary: #7C3AED (vivid purple) → for main actions, brand identity
// Secondary: #EC4899 (pink) → for matches, likes, hearts
// Accent: #06B6D4 (cyan) → for safety features, trust indicators
// Dark mode: default, with slate-900/950 backgrounds
// Custom animations: pulse-slow, slide-up, fade-in, swipe-left, swipe-right
```

---

## 6.2 App Router Pages

### Page Structure
```
src/app/
├── layout.tsx              # Root layout (fonts, metadata, providers)
├── page.tsx                # Landing page (unauthenticated)
├── globals.css             # Tailwind imports + custom styles
│
├── (auth)/
│   ├── layout.tsx          # Auth layout (centered, minimal)
│   ├── login/page.tsx      # Login form
│   └── register/page.tsx   # Multi-step registration
│
├── (main)/
│   ├── layout.tsx          # Main layout (sidebar + navbar)
│   ├── discover/page.tsx   # Swipe/card-based discovery
│   ├── matches/page.tsx    # Match list
│   ├── chat/
│   │   ├── page.tsx        # Chat thread list
│   │   └── [threadId]/page.tsx  # Chat conversation
│   ├── profile/
│   │   ├── page.tsx        # View own profile
│   │   └── edit/page.tsx   # Edit profile
│   ├── settings/page.tsx   # App settings
│   └── safety/page.tsx     # Safe date features
│
└── (premium)/
    └── subscription/page.tsx  # Subscription plans
```

---

## 6.3 Detailed Page Specifications

### 6.3.1 Landing Page (`page.tsx`)
- **Hero section**: Gradient background, tagline "Find Your Connection, Safely"
- **Feature cards**: Dual Identity, AI Safety, Intent Matching, Privacy-first
- **CTA buttons**: "Get Started" → register, "Sign In" → login
- **Stats section**: User count, matches made, etc. (placeholder data)
- **Footer**: Links, privacy policy, terms

### 6.3.2 Registration Page (`register/page.tsx`)
Multi-step form (4 steps):

| Step | Fields | Validation |
|------|--------|-----------|
| 1. Account | Email, password, confirm password | Email format, password strength (8+ chars, mixed case, number, special) |
| 2. Identity | Display name, age, gender identity, sexual orientation, pronouns | Age ≥ 18, required fields |
| 3. Intent | Intent selection (exploring/serious/discreet/friendship), bio (optional) | Must select one intent |
| 4. Preferences | Preferred genders (multi-select), age range (slider), max distance (slider) | At least one gender selected |

- Progress indicator at top
- Animated transitions between steps (framer-motion)
- On submit: call `/api/v1/auth/register` → store tokens → redirect to discover

### 6.3.3 Login Page (`login/page.tsx`)
- Email + password form
- "Forgot Password" link
- Animated background gradient
- On submit: call `/api/v1/auth/login` → store tokens → redirect to discover

### 6.3.4 Discover Page (`discover/page.tsx`)
- **Card stack**: Tinder-style swipeable profile cards
- Each card shows: photo, name, age, city, intent badge, bio preview
- **Actions**: Like (heart), Pass (X), Super Like (star)
- Swipe gestures with framer-motion drag
- On like: `POST /api/v1/matches/{user_id}/like`
- On mutual match: show "It's a Match!" overlay with animation
- Empty state: "No more profiles. Check back later!"

### 6.3.5 Matches Page (`matches/page.tsx`)
- Grid of match cards with profile photos
- Each card: photo, name, age, "Message" button
- Filter tabs: All, New, Mutual
- On "Message" click → navigate to chat thread

### 6.3.6 Chat Thread List (`chat/page.tsx`)
- List of chat threads sorted by last_message_at
- Each item: avatar, name, last message preview, timestamp, unread badge
- Online status indicator (green dot)
- Search bar to filter threads

### 6.3.7 Chat Conversation (`chat/[threadId]/page.tsx`)
- **Header**: User avatar, name, online status, "..." menu (block, report, unmatch)
- **Message area**: Scrollable, auto-scroll to bottom, infinite scroll for history
- **Message bubbles**: Sent (right, purple), Received (left, gray)
- **Moderated messages**: Blurred/hidden with "This message was flagged" indicator
- **Input area**: Text input, send button, attachment button (placeholder)
- **Typing indicator**: Animated dots when other user is typing
- **Read receipts**: Double-check marks for read messages
- Real-time via socket.io: connect on mount, disconnect on unmount

### 6.3.8 Profile View (`profile/page.tsx`)
- **Public section**: Photo carousel, name, age, gender, orientation, pronouns, bio, city, intent badge
- **Private section**: Collapsed by default, shows reveal controls
- **Stats**: Match count, member since
- Buttons: "Edit Profile", "Privacy Settings"

### 6.3.9 Profile Edit (`profile/edit/page.tsx`)
- **Public profile form**: All editable fields with live preview
- **Private profile form**: Real name, phone, address (shown as "encrypted" badges)
- **Photo management**: Upload, reorder, delete (up to 6 photos)
- **Preferences section**: Gender, orientation, age range, distance sliders
- Save triggers profile.updated event → re-embedding

### 6.3.10 Settings Page (`settings/page.tsx`)
- **Account**: Change email, change password, delete account
- **Privacy**: Profile visibility toggle, anonymous mode, block list management
- **Notifications**: Toggle push, email, match, message notifications
- **Subscription**: Current plan, upgrade link

### 6.3.11 Safety Page (`safety/page.tsx`)
- **Safe Date Setup**: 
  - Form: Emergency contact name + phone, meeting location, scheduled time
  - Check-in interval setting (15/30/60 min)
  - Enable/disable live location sharing
  - "Start Safe Session" button
- **Active Session Dashboard**:
  - Timer showing time since last check-in
  - "Check In" button (resets timer)
  - "SOS" button (large, red) → triggers emergency alert
  - Map showing shared location (if enabled)
- **Session History**: Past safe sessions with timestamps

### 6.3.12 Subscription Page (`subscription/page.tsx`)
- **Plan cards**: Free, Plus (₹499), Premium (₹999), Elite (₹1999)
- Each card: feature list, price, "Subscribe" CTA
- Current plan highlighted
- Toggle: Monthly / Yearly pricing
- FAQ accordion at bottom

---

## 6.4 Component Library

### UI Primitives (`components/ui/`)
| Component | Description |
|-----------|-------------|
| `Button.tsx` | Primary, secondary, outline, danger, ghost variants + loading state |
| `Input.tsx` | Text, email, password with validation states, icons |
| `Card.tsx` | Elevated card with hover effects |
| `Badge.tsx` | Intent badges (exploring=blue, serious=purple, discreet=gray, friendship=green) |
| `Avatar.tsx` | Circular image with online indicator |
| `Modal.tsx` | Animated modal with backdrop blur |
| `Slider.tsx` | Range slider for age, distance |
| `Toggle.tsx` | Switch toggle for settings |
| `Tabs.tsx` | Tab navigation component |
| `Toast.tsx` | Notification toast (react-hot-toast wrapper) |
| `Skeleton.tsx` | Loading skeleton placeholders |
| `EmptyState.tsx` | Illustrated empty state messages |

### Feature Components
| Directory | Components |
|-----------|------------|
| `components/auth/` | LoginForm, RegisterForm, StepIndicator |
| `components/profile/` | ProfileCard, ProfileForm, PhotoUploader, PreferenceForm, RevealButton |
| `components/matching/` | SwipeCard, SwipeStack, MatchOverlay, MatchGrid |
| `components/chat/` | ThreadList, ThreadItem, MessageBubble, ChatInput, TypingIndicator, ReadReceipt |
| `components/safety/` | SafeSessionForm, SOSButton, CheckInTimer, LocationMap |
| `components/layout/` | Navbar, Sidebar, MobileNav, Footer |

---

## 6.5 State Management (Zustand)

### Auth Store (`stores/authStore.ts`)
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
}
```

### Chat Store (`stores/chatStore.ts`)
```typescript
interface ChatState {
  threads: ChatThread[];
  activeThread: string | null;
  messages: Record<string, Message[]>;      // threadId → messages
  typingUsers: Record<string, string[]>;    // threadId → userIds
  onlineUsers: Set<string>;
  unreadCounts: Record<string, number>;
  setActiveThread: (threadId: string) => void;
  addMessage: (threadId: string, message: Message) => void;
  setTyping: (threadId: string, userId: string, isTyping: boolean) => void;
  markRead: (threadId: string, messageIds: string[]) => void;
}
```

### Match Store (`stores/matchStore.ts`)
```typescript
interface MatchState {
  candidates: MatchCandidate[];
  matches: Match[];
  isLoading: boolean;
  fetchCandidates: () => Promise<void>;
  likeUser: (userId: string) => Promise<MatchResult>;
  passUser: (userId: string) => Promise<void>;
  fetchMatches: () => Promise<void>;
}
```

### Profile Store (`stores/profileStore.ts`)
```typescript
interface ProfileState {
  publicProfile: PublicProfile | null;
  privateProfile: PrivateProfile | null;
  preferences: UserPreference | null;
  fetchProfile: () => Promise<void>;
  updatePublicProfile: (data: Partial<PublicProfile>) => Promise<void>;
  updatePreferences: (data: Partial<UserPreference>) => Promise<void>;
}
```

---

## 6.6 API Client (`lib/api.ts`)

```typescript
// Axios instance with interceptors:
// - Request interceptor: attach access token from authStore
// - Response interceptor: on 401, try refresh token, retry original request
// - Base URL: process.env.NEXT_PUBLIC_API_URL (default: http://localhost/api/v1)

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});
```

## 6.7 Socket Client (`lib/socket.ts`)

```typescript
// socket.io client setup:
// - Connect to backend WebSocket URL
// - Send JWT as auth parameter
// - Auto-reconnect with exponential backoff
// - Event listeners update chatStore

export function connectSocket(token: string): Socket {
  const socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });
  // Register event handlers...
  return socket;
}
```

---

## 6.8 Auth Protection

```typescript
// lib/auth.ts — Route protection via middleware or layout checks

// Next.js Middleware (src/middleware.ts):
// - Check for access token cookie/header
// - Redirect unauthenticated users from (main)/* to /login
// - Redirect authenticated users from (auth)/* to /discover
```

---

## 6.9 Design System

### Color Palette
```css
/* Primary gradient: purple → pink */
--primary: #7C3AED;
--primary-hover: #6D28D9;
--secondary: #EC4899;
--accent: #06B6D4;
--success: #10B981;
--warning: #F59E0B;
--danger: #EF4444;
--bg-dark: #0F172A;
--bg-card: #1E293B;
--text-primary: #F8FAFC;
--text-secondary: #94A3B8;
```

### Typography
```css
/* Google Fonts: Inter for body, Outfit for headings */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap');
```

### Animations
- Page transitions: slide-up with fade
- Card swipe: spring physics with framer-motion
- Match overlay: confetti + scale animation
- Message appearance: fade-in from bottom
- Skeleton loading: shimmer effect
- Button hover: subtle scale + shadow

---

## 6.9b Internationalization (i18n)

Required because Elyra is India-first.

```
src/i18n/
├── locales/
│   ├── en.json        # English (default)
│   └── hi.json        # Hindi
├── config.ts          # next-intl config
└── middleware.ts      # locale detection (Accept-Language → cookie)
```

- All user-facing strings go through `useTranslations()` from `next-intl`.
- Locale toggle in Settings page, persisted in cookie `NEXT_LOCALE`.
- Date/number formatting via `Intl.DateTimeFormat` / `Intl.NumberFormat`.
- RTL not required (en, hi both LTR).
- Brand strings ("Elyra", "Pehchaan Layer") are NOT translated.

---

## 6.9c Accessibility (a11y)

| Requirement | Implementation |
|---|---|
| Color contrast | All text/background pairs meet WCAG 2.1 AA (4.5:1 normal, 3:1 large) |
| Keyboard navigation | Every interactive element focusable; logical tab order; visible focus ring |
| ARIA | Modals use `role="dialog"`, `aria-modal="true"`, focus trap; toasts use `aria-live` |
| Screen reader | Every `<img>` has `alt`; icons-only buttons have `aria-label` |
| Reduced motion | Respect `prefers-reduced-motion` — disable card swipe spring physics |
| Form errors | `aria-invalid` + `aria-describedby` linking to error message |
| Skip-to-content link in main layout |

Add eslint-plugin-jsx-a11y to lint config.

---

## 6.9d Progressive Web App (PWA)

- `next-pwa` configured in `next.config.js` (production only).
- `public/manifest.json` with name "Elyra", short_name, theme_color (#7C3AED), icons (192, 512).
- Service worker caches static assets + offline-fallback page.
- "Add to home screen" prompt component on landing.

---

## 6.9e Error Handling & Observability

- `src/app/error.tsx` — Next.js global error boundary.
- `src/app/not-found.tsx` — 404 page.
- `src/components/ErrorBoundary.tsx` — wraps risky subtrees (chat, swipe stack).
- `src/lib/sentry.ts` — `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN })` invoked from `instrumentation.ts`.
- Toast on every API failure with retry option (using `react-hot-toast`).
- Loading: `loading.tsx` + `Suspense` wrappers in each route segment.

---

## 6.9f SEO

- Per-route `generateMetadata()` exporting `title`, `description`, `openGraph`, `twitter`.
- `public/robots.txt` (allows public pages, disallows `/chat/`, `/profile/`, `/settings/`).
- `public/sitemap.xml` (static for landing + auth pages).
- Default OG image at `public/og-default.png`.

---

## 6.10 Responsive Design

| Breakpoint | Layout |
|-----------|--------|
| Mobile (<640px) | Bottom navigation, full-width cards, stacked layouts |
| Tablet (640-1024px) | Side navigation collapsed, 2-column grid |
| Desktop (>1024px) | Persistent sidebar, 3-column layout for chat |

---

## 6.11 Phase 6 File Creation Checklist

| # | File | Contents |
|---|------|----------|
| 1 | `frontend/src/app/layout.tsx` | Root layout (fonts, providers, Sentry, PWA meta) |
| 2 | `frontend/src/app/page.tsx` | Landing page (incl. "Pehchaan Layer" copy) |
| 3 | `frontend/src/app/globals.css` | Tailwind base + custom CSS vars |
| 4 | `frontend/src/app/error.tsx` | Global error boundary |
| 5 | `frontend/src/app/not-found.tsx` | 404 page |
| 6 | `frontend/src/app/loading.tsx` | Default loading skeleton |
| 7 | `frontend/src/app/(auth)/layout.tsx` | Auth layout |
| 8 | `frontend/src/app/(auth)/login/page.tsx` | Login page (incl. OAuth buttons) |
| 9 | `frontend/src/app/(auth)/register/page.tsx` | 4-step registration |
| 10 | `frontend/src/app/(auth)/verify-email/page.tsx` | Email verification handler |
| 11 | `frontend/src/app/(auth)/forgot-password/page.tsx` | Forgot password |
| 12 | `frontend/src/app/(auth)/reset-password/page.tsx` | Reset password |
| 13 | `frontend/src/app/(main)/layout.tsx` | Main layout with sidebar + bottom nav |
| 14 | `frontend/src/app/(main)/discover/page.tsx` | Swipe discovery |
| 15 | `frontend/src/app/(main)/matches/page.tsx` | Matches grid |
| 16 | `frontend/src/app/(main)/chat/page.tsx` | Thread list |
| 17 | `frontend/src/app/(main)/chat/[threadId]/page.tsx` | Conversation view |
| 18 | `frontend/src/app/(main)/profile/page.tsx` | Own profile view |
| 19 | `frontend/src/app/(main)/profile/edit/page.tsx` | Edit profile |
| 20 | `frontend/src/app/(main)/profile/[userId]/page.tsx` | View other user's profile |
| 21 | `frontend/src/app/(main)/settings/page.tsx` | Settings |
| 22 | `frontend/src/app/(main)/safety/page.tsx` | Safe date center |
| 23 | `frontend/src/app/(main)/notifications/page.tsx` | Notification center |
| 24 | `frontend/src/app/(premium)/subscription/page.tsx` | Subscription plans |
| 25 | `frontend/src/instrumentation.ts` | Sentry init |
| 26-37 | `frontend/src/components/ui/*.tsx` | 12 UI primitives |
| 38-42 | `frontend/src/components/auth/*.tsx` | Auth components (incl. OAuthButtons, OtpInput) |
| 43-47 | `frontend/src/components/profile/*.tsx` | Profile components (incl. PrivateRevealModal) |
| 48-51 | `frontend/src/components/matching/*.tsx` | Match components |
| 52-57 | `frontend/src/components/chat/*.tsx` | Chat components (incl. AnonymousBadge) |
| 58-61 | `frontend/src/components/safety/*.tsx` | Safety components (incl. LiveLocationMap) |
| 62-64 | `frontend/src/components/layout/*.tsx` | Layout components |
| 65 | `frontend/src/lib/api.ts` | Axios client + 401 refresh interceptor |
| 66 | `frontend/src/lib/socket.ts` | Socket.io client + reconnection + heartbeat |
| 67 | `frontend/src/lib/auth.ts` | Auth helpers + token storage |
| 68 | `frontend/src/lib/utils.ts` | Utility functions |
| 69 | `frontend/src/lib/sentry.ts` | Sentry helpers |
| 70 | `frontend/src/stores/authStore.ts` | Auth state |
| 71 | `frontend/src/stores/chatStore.ts` | Chat state |
| 72 | `frontend/src/stores/matchStore.ts` | Match state |
| 73 | `frontend/src/stores/profileStore.ts` | Profile state |
| 74 | `frontend/src/stores/notificationStore.ts` | Notifications state |
| 75 | `frontend/src/stores/safetyStore.ts` | SafeSession state |
| 76 | `frontend/src/hooks/useSocket.ts` | Hook to access socket from any component |
| 77 | `frontend/src/hooks/useAuth.ts` | Hook for auth state |
| 78 | `frontend/src/types/index.ts` | TypeScript types matching backend Pydantic |
| 79 | `frontend/src/middleware.ts` | Auth route protection + locale detection |
| 80 | `frontend/src/i18n/config.ts` | next-intl config |
| 81 | `frontend/src/i18n/locales/en.json` | English strings |
| 82 | `frontend/src/i18n/locales/hi.json` | Hindi strings |
| 83 | `frontend/tailwind.config.ts` | Custom theme |
| 84 | `frontend/next.config.js` | next-pwa wrap + rewrites + Sentry |
| 85 | `frontend/public/manifest.json` | PWA manifest |
| 86 | `frontend/public/robots.txt` | SEO directives |
| 87 | `frontend/playwright.config.ts` | E2E config (Phase 9 uses) |

---

## 6.12 Mobile Scaffold (`mobile/`)

> Optional — scaffold only. Production mobile build is post-v1.

| # | File | Contents |
|---|------|----------|
| 1 | `mobile/package.json` | expo, react-native, navigation, zustand, axios, socket.io-client |
| 2 | `mobile/app.json` | Expo config (name "Elyra", slug, icon, splash) |
| 3 | `mobile/App.tsx` | NavigationContainer + auth-conditional stack |
| 4 | `mobile/src/screens/LoginScreen.tsx` | Stub screen |
| 5 | `mobile/src/screens/DiscoverScreen.tsx` | Stub screen |
| 6 | `mobile/src/screens/ChatScreen.tsx` | Stub screen |
| 7 | `mobile/src/lib/api.ts` | Same axios pattern as web |
| 8 | `mobile/src/stores/authStore.ts` | Re-uses Zustand pattern with MMKV persistence |
| 9 | `mobile/README.md` | "This is a scaffold; not feature-complete" |

---

*Phase 6 complete. Proceed to Phase 7: Integration.*
