# Project: ISKCON Youth Forum Patna — Website Build

I'm building a central website for ISKCON Youth Forum Patna. Act as a senior full-stack architect and engineer. Read this entire spec before writing any code, then propose a project scaffold/plan before generating files, so I can confirm before you proceed.

## Tech Stack (fixed — do not substitute)
- Next.js (App Router, JavaScript — not TypeScript)
- Tailwind CSS
- Framer Motion
- shadcn/ui as base component primitives
- Aceternity UI for motion-heavy marketing sections (Home hero, bento grids)
- 21st.dev components used sparingly for accents, layered on top of shadcn — don't let visual language clash
- Clerk for authentication (roles: `user`, `admin` via Clerk public metadata)
- MongoDB for the database (use the native driver or Mongoose — pick one and be consistent)
- Resend for transactional email
- PWA support (use Serwist, not next-pwa, which is unmaintained)
- next-intl for i18n

## Core Product Requirements

### Languages
- Default locale: Hindi (`hi`). English (`en`) is a toggle.
- Locale lives in the URL: `/hi/...` and `/en/...`. Middleware redirects `/` to `/hi` unless a saved cookie preference says otherwise.
- Static UI strings (nav, buttons, labels, toasts) go through next-intl dictionaries.
- Any content stored in MongoDB (Programs, Courses, Festivals, Gallery captions) must use a bilingual field shape, e.g.:
  ```js
  title: { hi: "भक्ति वृक्ष", en: "Bhakti Vriksha" }
  ```
  Every admin form for this content must have side-by-side Hindi/English inputs — never a single field with a "translate later" flag.

### App-like experience
- Desktop: sticky glass navbar (liquid glass style — backdrop-blur, semi-transparent, subtle inner border highlight), shrinks slightly on scroll via Framer Motion `useScroll`.
- Mobile: fixed bottom dock (native-app tab bar pattern), NOT a hamburger menu. Icons: Home, Programs, Playground, Festivals, Profile/Dashboard. Active tab has a Framer Motion `layoutId` sliding indicator. Respect iOS safe-area-inset-bottom.
- Page transitions: `AnimatePresence` wrapping route children, fast (150–200ms), subtle — must stay smooth on low-end Android devices, so no heavy blur/shadow stacking during transitions.
- PWA: manifest with standalone display mode, install prompt is a custom in-app dismissible component (not the raw browser banner), offline fallback page, cache-first for static assets, network-first for Programs/Courses/Festivals, stale-while-revalidate for Gallery images. Japa Counter and Gita Quiz should be usable offline and sync state when back online.

### Liquid glass design system
Build reusable components: `GlassCard`, `GlassNav`, `GlassModal`, `GlassDock`. Use backdrop-filter blur + semi-transparent gradient fills tinted with the brand palette (I have a design reference — ask me for exact hex values / Tailwind theme extension before finalizing the theme config, don't guess colors). Keep blur restrained on data-dense screens like Dashboard — legibility over aesthetics there.

## Navigation Structure
```
Home | About | Programs | Gallery | Courses | Playground | Festivals
```
Plus an authenticated area: `Dashboard` (not in main nav — accessed via profile icon/dock).

## Page-by-Page Spec

**Home** — Two distinct layouts, not one responsive layout: a desktop motion-site landing page (hero, About preview, Programs preview, current-festival banner, join CTA) and a separate mobile-optimized layout with the bottom dock. I'll provide the desktop hero motion spec separately — scaffold the route and layout shell now, hero content comes later.

**About** — Short description of IYF Patna, one group photo, a "members" avatar stack/grid component (hover reveals name).

**Programs** — List of programs (from MongoDB, bilingual fields). Each has a "Join" button opening a `GlassModal` with a registration form. If signed in (Clerk), autofill name/email/phone. On submit, write a `Registration` document and trigger the notification pipeline (see below).

**Courses** — Same pattern as Programs: list, Join modal, autofill, registration + notification.

**Gallery** — Static/ISR image grid, lazy-loaded, lightbox on click.

**Playground** — Hub page with 4 glass tile cards linking to isolated routes:
1. `/playground/japa-counter` — tap counter, gamified streaks/rounds-of-108, local state synced to a `JapaLog` collection per user, works offline via PWA.
2. `/playground/kirtan-library` — audio player UI, tracks stored in MongoDB with CDN-hosted audio URLs (not self-hosted on the Next.js server).
3. `/playground/gita-quiz` — question bank in MongoDB, client-side quiz engine, scores written to `QuizScore` collection.
4. `/playground/spiritual-calendar` — Ekadashi/festival calendar. Flag this feature and stub the data source for now; note in code that a proper Vaishnava panchang data source needs to be integrated later rather than hand-computing tithi dates.
Gate each app behind its own feature flag (see Feature Flags section) so the hub can ship before every app is finished.

**Festivals** — Query MongoDB for the festival document where `isCurrent: true` and render it as the hero (full schedule as a timeline component). Other festivals render as a secondary scrollable list. Seed data: Janmashtami with this schedule (bilingual):
- 23–28 Jul: Jhulan Utsav
- 30 Jul: Adhivas
- 31 Jul – 2 Aug: Kirtan Mela
- 4 Aug: Janmashtami
Do not hardcode "Janmashtami is default" in component logic — it must come from the `isCurrent` flag on the data so next year's team just flips a flag, not a deploy.

**Dashboard** (protected route) — Tabs: Quiz Scores, Programs/Courses joined + attendance status (joined/attended/missed), Japa stats. Pull from `Registration`, `QuizScore`, `JapaLog`, `Attendance` collections keyed by `clerkId`. Gate the entire route behind a `dashboard.enabled` feature flag for phased rollout.

## Notification Pipeline (email now, WhatsApp behind a flag)

Build a provider-agnostic abstraction now so WhatsApp slots in later without refactoring:

```
/lib/notifications/
  index.js        → sendJoinNotification(payload) — orchestrator
  email.js        → Resend implementation, live now
  whatsapp.js     → stubbed/mocked implementation behind a flag, log-only for now
  templates/
    email/joinProgram.jsx
    email/joinCourse.jsx
```

Rules:
- Registration write to MongoDB is the source of truth. Notification failures must NEVER fail or roll back the registration — wrap each channel call in try/catch, log failures, continue.
- Log every notification attempt (success or failure, which channels fired) to a `notificationLogs` collection.
- `sendWhatsapp` should be written against a clean interface (payload in, result out) and just log/mock-send for now — when a real provider (AiSensy/Gupshup/Twilio) is chosen later, only this one file changes.

## Feature Flags (build this first — it's infrastructure, not a nice-to-have)

DB-backed flags in a MongoDB `featureFlags` collection, NOT env vars (need runtime toggling without redeploy). Shape:
```js
{
  key: "whatsapp_notifications",
  enabled: false,
  scope: "global",
  temporary: true,   // dependency/rollout flags get removed eventually; content/kill-switch flags are permanent
  meta: { provider: "aisensy", updatedBy: "", updatedAt: null, note: "" }
}
```
Build `/lib/flags.js` with a `getFlag(key)` helper, in-memory cached with ~30s TTL to avoid hammering Mongo. Build a minimal `/admin/flags` page (Clerk role-gated to `admin`) as a toggle table — this becomes the ops control panel for the whole project.

Seed these flags at project start:
- `whatsapp_notifications` (off, temporary)
- `sms_notifications` (off, temporary)
- `payment_gateway` (off, temporary)
- `home.showLiveEventBanner` (off, permanent)
- `playground.kirtan_library`, `playground.gita_quiz`, `playground.japa_counter`, `playground.spiritual_calendar` (off individually until each is built, permanent-ish until all launched)
- `registrations.programsOpen` (on, permanent kill-switch)
- `maintenance_mode` (off, permanent kill-switch)
- `admin.attendanceEditingEnabled` (on, permanent kill-switch)
- `dashboard.enabled` (off until Clerk+Mongo sync verified in prod, temporary)
- `i18n.englishEnabled` (off until English translations are complete, temporary)
- `pwa.installPromptEnabled` (off until tested with a small group, temporary)

## MongoDB Collections
`Users`, `Programs`, `Courses`, `Registrations`, `Festivals`, `GalleryItems`, `QuizQuestions`, `QuizScores`, `JapaLogs`, `Attendance`, `KirtanTracks`, `FeatureFlags`, `NotificationLogs`

## Auth (Clerk)
- Protect `/dashboard/*` and `/admin/*` via `clerkMiddleware`.
- On Clerk's `user.created` webhook, sync a minimal `User` document into MongoDB keyed by `clerkId` (Clerk owns identity; Mongo owns app data).
- Capture phone number at onboarding (needed later for WhatsApp) via a Clerk custom field or a first-login step.

## Build Order — follow this sequence, don't parallelize everything
1. Next.js scaffold + Tailwind + Clerk + MongoDB connection + i18n routing skeleton + feature flags infrastructure (`/lib/flags.js` + seed script + `/admin/flags` page)
2. Glass design system components (`GlassCard`, `GlassNav`, `GlassModal`, `GlassDock`) + desktop navbar + mobile bottom dock + PWA manifest/service worker shell
3. Home page (desktop first, then mobile-optimized version)
4. About + Gallery
5. Programs + Courses + Join modal + registration write + email notification pipeline (WhatsApp stubbed behind flag)
6. Festivals (seed Janmashtami as the `isCurrent` festival)
7. Playground hub, then Japa Counter first (simplest, most demo-able), then the rest gated by flags
8. Dashboard
9. Polish: animation pass, offline fallback, translation completeness audit, flip `i18n.englishEnabled` and `dashboard.enabled` flags on

## What I need from you right now
Don't generate all files at once. Start with Build Order step 1 only: propose the exact file/folder scaffold, the Tailwind theme config placeholder (ask me for hex values from my design reference before finalizing colors), the MongoDB connection utility, the feature flags module + seed script, and the i18n middleware. Show me the plan, then wait for my go-ahead before writing code.
