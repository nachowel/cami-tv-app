# Implementation Plan: ICMG Bexley TV Display System

**Date:** 2026-05-01  
**Estimated duration:** 5-8 focused development days  
**Source:** [.agent/SCOPE-icmg-bexley-tv-display-system.md](.agent/SCOPE-icmg-bexley-tv-display-system.md)

## Summary

Build a Vite + React + TypeScript application with two routes: `/tv` for the public read-only Android TV display and `/admin` for authenticated mosque staff. Start with mock data to stabilize the layout, then add Firebase Auth, Firestore real-time sync, offline fallback behavior, theme behavior, QR generation, and prayer countdown logic.

The implementation should prioritize stable display behavior, readable typography, predictable admin forms, and small testable utility modules.

## Tech Stack Decisions

| Area | Choice | Reason |
|------|--------|--------|
| Frontend | React + Vite + TypeScript | Fast local development, typed UI code, simple deployment |
| Styling | Tailwind CSS | Efficient layout and theme styling |
| Routing | React Router | Clear `/tv` and `/admin` route separation |
| Auth | Firebase Auth | Simple MVP login for authorized admin users |
| Backend | Firebase Firestore | Real-time sync with low backend maintenance |
| Hosting | Vercel | Simple deployment for browser-based TV app |
| QR Code | `qrcode.react` or equivalent | Dynamic QR rendering from admin-managed URL |
| Date/Time | Native Date + small helpers initially | Avoid overbuilding; add a date library only if needed |
| Hijri Date | Lightweight Hijri conversion library | More reliable than manual conversion |

## Affected Areas

```text
project-root/
├── package.json                         <- new project dependencies/scripts
├── index.html                           <- Vite entry
├── src/
│   ├── main.tsx                         <- app bootstrap
│   ├── App.tsx                          <- route shell
│   ├── routes/
│   │   ├── TvDisplay.tsx                <- /tv route
│   │   └── AdminPanel.tsx               <- /admin route
│   ├── components/
│   │   ├── tv/                          <- clock, prayer list, donation, ticker
│   │   └── admin/                       <- admin forms and panels
│   ├── data/
│   │   └── mockDisplayData.ts           <- MVP mock data
│   ├── services/
│   │   ├── firebase.ts                  <- Firebase app/Auth/Firestore setup
│   │   ├── authService.ts               <- Firebase Auth helpers
│   │   └── firestoreDisplayService.ts   <- Firestore reads/writes
│   ├── hooks/
│   │   ├── useDisplayData.ts            <- mock/Firestore data source
│   │   ├── useLastKnownDisplayData.ts   <- TV fallback cache
│   │   ├── useAdminAuth.ts              <- admin login state
│   │   ├── useClock.ts                  <- 1-second clock updates
│   │   └── useThemeMode.ts              <- auto/light/dark resolution
│   ├── utils/
│   │   ├── prayerTimes.ts               <- next prayer/countdown logic
│   │   ├── announcementFilters.ts       <- expiry filtering
│   │   └── hijriDate.ts                 <- Hijri formatting
│   ├── types/
│   │   └── display.ts                   <- shared domain types
│   └── styles/
│       └── globals.css                  <- Tailwind and theme tokens
├── firebase.json                        <- hosting/config if needed
├── vercel.json                          <- SPA routing/deploy config if needed
└── tests/                               <- utility and component tests
```

## Dependency Graph

```text
T1 Project scaffold
├── T2 Domain types and mock data
│   ├── T3 TV display layout
│   ├── T4 Admin panel mock forms
│   └── T5 Time/prayer utility logic
├── T6 Theme system
├── T7 QR and donation display
└── T8 Firebase service layer
    ├── T9 Firebase Auth for admin
    ├── T10 Admin Firestore writes
    └── T11 TV Firestore subscriptions and cache
        └── T12 Real TV QA
```

## Tasks

### Phase 1: Foundation

- [ ] **T1: Scaffold React/Vite project** `[CHECKPOINT]`
  - Files: `package.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, Tailwind config
  - Content: Vite React TypeScript setup with `/tv` and `/admin` routes
  - Dependency: none
  - Test: app starts locally and both routes render placeholder screens

- [ ] **T2: Define domain types and mock data**
  - Files: `src/types/display.ts`, `src/data/mockDisplayData.ts`
  - Content: `settings/display`, `donation/current`, `prayerTimes/current`, `dailyContent/current`, `announcements/{id}` shapes
  - Dependency: T1
  - Test: TypeScript compile passes and mock data satisfies domain types, including today's prayer times and announcement metadata

### Phase 2: TV MVP With Mock Data

- [ ] **T3: Build TV layout shell** `[RISK] [CHECKPOINT]`
  - Files: `src/routes/TvDisplay.tsx`, `src/components/tv/*`
  - Content: left, center, right, bottom display areas
  - Dependency: T2
  - Test: desktop/TV viewport screenshot confirms no overlap and readable hierarchy

- [ ] **T4: Add clock, date, and rotating content**
  - Files: `src/hooks/useClock.ts`, `src/components/tv/ClockPanel.tsx`, `src/components/tv/DailyContent.tsx`
  - Content: 1-second clock updates, Gregorian/Hijri date, 10-15 second rotation
  - Dependency: T3
  - Test: clock updates without layout shift; content rotates predictably

- [ ] **T5: Add prayer highlighting and countdown logic** `[RISK] [CHECKPOINT]`
  - Files: `src/utils/prayerTimes.ts`, `src/components/tv/PrayerTimesPanel.tsx`
  - Content: today's prayer times, current prayer, next prayer, countdown to next prayer, next-day Fajr after Isha
  - Dependency: T2
  - Test: unit tests cover before first prayer, between prayers, after Isha, and future `tomorrow` data support

- [ ] **T6: Add announcements ticker**
  - Files: `src/utils/announcementFilters.ts`, `src/components/tv/AnnouncementTicker.tsx`
  - Content: `announcements` collection filtering by `active` and `expires_at`, then rotation
  - Dependency: T3
  - Test: inactive and expired announcements are hidden; active items rotate

- [ ] **T7: Add donation block and QR code**
  - Files: `src/components/tv/DonationPanel.tsx`
  - Content: weekly amount, support message, QR code, website/donation link
  - Dependency: T3
  - Test: QR updates when URL changes and remains visible at TV resolution

### Phase 3: Admin MVP With Mock State

- [ ] **T8: Build admin panel structure** `[CHECKPOINT]`
  - Files: `src/routes/AdminPanel.tsx`, `src/components/admin/*`
  - Content: clear sections for donation, announcements, prayer times, daily content, theme
  - Dependency: T2
  - Test: admin page is usable on phone viewport and desktop viewport

- [ ] **T9: Add Firebase Auth gate for `/admin`** `[RISK] [CHECKPOINT]`
  - Files: `src/services/authService.ts`, `src/hooks/useAdminAuth.ts`, `src/routes/AdminPanel.tsx`, admin login component
  - Content: login required for `/admin`; `/tv` stays public read-only; authorized admin users only; no roles
  - Dependency: T8
  - Test: unauthenticated users see login on `/admin`; authenticated users see admin forms; `/tv` renders without login

- [ ] **T10: Add admin form validation**
  - Files: `src/components/admin/*`, `src/utils/validation.ts`
  - Content: required fields, valid time format, valid URL, date validation
  - Dependency: T8
  - Test: invalid inputs show clear errors and do not update state

### Phase 4: Theme System

- [ ] **T11: Implement theme resolver** `[RISK] [CHECKPOINT]`
  - Files: `src/hooks/useThemeMode.ts`, `src/styles/globals.css`
  - Content: default `auto`, manual `light`/`dark`, auto schedule 08:00-18:00, structure for configurable start/end later
  - Dependency: T2
  - Test: unit tests verify auto schedule boundaries, default auto behavior, manual overrides, and future start/end inputs

- [ ] **T12: Design separate light and dark themes**
  - Files: `src/styles/globals.css`, TV/admin components as needed
  - Content: readable contrast, non-inverted color systems, TV-safe spacing
  - Dependency: T11
  - Test: screenshot check for both themes on `/tv`

### Phase 5: Firebase Integration

- [ ] **T13: Add Firebase config and Firestore service layer** `[RISK] [CHECKPOINT]`
  - Files: `src/services/firestoreDisplayService.ts`, `src/services/firebase.ts`
  - Content: typed Firestore read/write helpers for `settings/display`, `donation/current`, `prayerTimes/current`, `dailyContent/current`, and `announcements` collection
  - Dependency: T2
  - Test: local Firebase config loads from environment variables; service functions are typed

- [ ] **T14: Connect admin panel to Firestore writes** `[BREAKING]`
  - Files: `src/routes/AdminPanel.tsx`, `src/hooks/useDisplayData.ts`
  - Content: authenticated saves for donation, announcements, today's prayer times, daily content, theme settings
  - Dependency: T9, T13
  - Test: admin saves update Firestore documents

- [ ] **T15: Connect TV display to Firestore subscriptions and last-known cache** `[RISK] [CHECKPOINT]`
  - Files: `src/routes/TvDisplay.tsx`, `src/hooks/useDisplayData.ts`, `src/hooks/useLastKnownDisplayData.ts`
  - Content: real-time display updates without reload; local cache of last valid data; small `Last updated` timestamp; no blank screen on temporary Firebase failure
  - Dependency: T13
  - Test: changing admin data updates `/tv` live; simulated Firestore/network failure keeps last known data visible

### Phase 6: Verification and Deploy

- [ ] **T16: Add route fallback and deploy config**
  - Files: `vercel.json`, optional `firebase.json`
  - Content: SPA route handling for `/tv` and `/admin`
  - Dependency: T1
  - Test: refresh on `/tv` and `/admin` works after build

- [ ] **T17: Real TV QA checklist** `[CHECKPOINT]`
  - Files: test docs or QA checklist
  - Content: 1920x1080 viewport, 3m readability, 5m readability, daylight readability, Android TV browser, fullscreen, TV sleep mode, internet disconnect fallback with last cached data
  - Dependency: T3-T16
  - Test: complete real TV QA checklist passes, including confirmation that the TV never shows a blank screen

## Parallel Work Opportunities

- T3 TV layout and T8 admin layout can run in parallel after T2.
- T5 prayer utility tests can run in parallel with T3 once mock data exists.
- T11 theme resolver can be developed in parallel with T8.
- T13 Firebase service can be prepared while mock UI work continues, but should not replace mock data until TV/admin MVP screens are stable.

## Risk List

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| TV layout is not readable from distance | Medium | High | Verify early with 1920x1080 screenshots and large typography before adding Firebase |
| Prayer countdown edge cases are wrong after final prayer | Medium | High | Unit test all day-boundary cases |
| TV shows a blank screen during Firebase outage | Medium | High | Cache last known valid data and verify disconnect behavior |
| Firestore document structure becomes inconsistent | Medium | Medium | Centralize domain types and service mapping |
| Admin is exposed without authentication | Medium | High | Firebase Auth gate on `/admin`; keep `/tv` public read-only |
| Admin panel becomes too technical | Medium | High | Use plain labels, grouped forms, and clear validation messages |
| Theme auto mode changes only after reload | Low | Medium | Implement theme as reactive state with time-based interval checks |
| Android TV browser performance issues | Low | High | Avoid heavy animations; keep rotations simple and timers controlled |

## Undefined Points

- [ ] Exact mosque logo asset is not provided yet.
- [ ] Website link separate from donation URL is not specified.
- [ ] Authorized admin user provisioning method must be confirmed in Firebase before deployment.
- [ ] Exact Hijri date calculation method should be confirmed, because local mosque calendars may differ by one day.
- [ ] Final visual language for light/dark themes should be reviewed on a TV-sized screen.

## Checkpoints

1. **After T1-T2:** Project runs and shared data model is stable.
2. **After T3-T7:** TV MVP works with mock data and is visually approved.
3. **After T8-T10:** Admin MVP works behind Firebase Auth and is usable on phone.
4. **After T11-T12:** Theme system works live and both themes are visually approved.
5. **After T13-T15:** Firebase sync works from authenticated admin to public TV, with last-known fallback.
6. **After T16-T17:** Build, route fallback, and real TV QA pass.

## Testing Strategy

- Unit tests for `prayerTimes`, `announcementFilters`, and `useThemeMode` logic.
- Auth smoke tests for `/admin` protected access and `/tv` public access.
- Component tests for major TV panels and admin form validation where practical.
- Manual browser verification for `/tv` at 1920x1080 and a smaller fallback viewport.
- Manual browser verification for `/admin` on mobile width.
- Firestore integration smoke test: update admin data and confirm `/tv` changes without reload.
- Offline/fallback smoke test: disconnect internet or simulate Firestore failure and confirm `/tv` shows last known data plus `Last updated`.

## Real TV QA Checklist

- [ ] `/tv` checked at 1920x1080 viewport.
- [ ] 3m readability check passed.
- [ ] 5m readability check passed.
- [ ] Daylight readability check passed.
- [ ] Android TV browser test passed.
- [ ] Fullscreen test passed.
- [ ] TV sleep mode check passed.
- [ ] Internet disconnect fallback shows last cached data.
- [ ] `Last updated` timestamp is visible but unobtrusive.
- [ ] Temporary Firebase/network failure never results in a blank screen.

## Next Step

Run an architecture review before implementation begins. The risk-heavy areas are TV layout readability, Firebase Auth gating, prayer countdown after Isha, Firestore document shape, last-known data fallback, and theme behavior.
