# Firestore Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock admin/TV content sourcing with Firestore documents and announcements collection while keeping `/tv` public, `/admin` authenticated, and rollback/fallback behavior explicit.

**Architecture:** Use one fixed Firestore document per singleton domain object and one `announcements` collection for repeatable records. `/admin` writes through authenticated client-side Firestore helpers, while `/tv` reads public documents and announcements through read-only subscriptions plus a last-known local fallback cache.

**Tech Stack:** Firebase Auth, Firebase Firestore, Vite env configuration, React hooks, TypeScript domain types

---

## 1. Exact Firestore Paths

Singleton documents:
- `settings/display`
- `donation/current`
- `prayerTimes/current`
- `dailyContent/current`

Collection:
- `announcements/{announcementId}`

Recommended announcement id format:
- `announcement-{uuid}`

Reasoning:
- The app already models settings, donation, prayer times, and daily content as single current records.
- Announcements need add/edit/delete semantics and independent expiry dates, so a collection is the right fit.

## 2. Canonical Seed Data Shape

This should follow the current codebase, not the older spec example.

### `settings/display`
```json
{
  "mosque_name": "ICMG Bexley",
  "language": "en",
  "theme_mode": "auto",
  "auto_theme_start": "08:00",
  "auto_theme_end": "18:00",
  "updated_at": "2026-05-01T18:00:00Z"
}
```

### `donation/current`
```json
{
  "weekly_amount": 750,
  "currency": "GBP",
  "donation_url": "https://icmgbexley.org.uk/donate",
  "updated_at": "2026-05-01T18:00:00Z"
}
```

### `prayerTimes/current`
```json
{
  "date": "2026-05-01",
  "today": {
    "fajr": "06:44",
    "sunrise": "08:44",
    "dhuhr": "12:47",
    "asr": "14:22",
    "maghrib": "16:41",
    "isha": "18:27"
  },
  "tomorrow": null,
  "updated_at": "2026-05-01T18:00:00Z"
}
```

### `dailyContent/current`
```json
{
  "arabic": "إن تجتنبوا كبائر ما تنهون عنه نكفر عنكم سيئاتكم وندخلكم مدخلا كريما",
  "translation": {
    "en": "If you avoid the major sins forbidden to you, We will remove your lesser sins and admit you to a noble entrance.",
    "tr": "Eğer size yasaklanan günahların büyüklerinden kaçınırsanız, sizin küçük günahlarınızı örteriz ve sizi güzel bir yere koyarız."
  },
  "source": "Nisâ Suresi 31. Ayet",
  "type": "ayah",
  "updated_at": "2026-05-01T18:00:00Z"
}
```

### `announcements/{announcementId}`
```json
{
  "id": "announcement-1",
  "text": {
    "en": "Jumu'ah prayer will be held at 13:15.",
    "tr": "Cuma namazı 13:15'te kılınacaktır."
  },
  "active": true,
  "expires_at": "2026-06-01T23:59:59Z",
  "created_at": "2026-05-01T18:00:00Z",
  "updated_at": "2026-05-01T18:00:00Z"
}
```

## 3. Public Read vs Admin Write Permissions

Public read required for `/tv`:
- `settings/display`
- `donation/current`
- `prayerTimes/current`
- `dailyContent/current`
- `announcements/{announcementId}`

Admin write required for authenticated `/admin` users:
- update `settings/display`
- update `donation/current`
- update `prayerTimes/current`
- update `dailyContent/current`
- create/update/delete `announcements/{announcementId}`

Out of scope for MVP:
- custom claims
- per-user role documents
- multi-level admin roles

MVP permission model:
- any authenticated Firebase user may write admin-managed documents
- any unauthenticated visitor may read the public TV data only

## 4. Firestore Security Rules Draft

This is the initial rules draft for MVP.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isLanguage(value) {
      return value == "en" || value == "tr";
    }

    function isThemeMode(value) {
      return value == "auto" || value == "light" || value == "dark";
    }

    function isTime(value) {
      return value is string && value.matches('^([01]\\d|2[0-3]):([0-5]\\d)$');
    }

    function isIsoDate(value) {
      return value is string && value.matches('^\\d{4}-\\d{2}-\\d{2}$');
    }

    function isIsoDateTimeOrNull(value) {
      return value == null || value is string;
    }

    match /settings/{docId} {
      allow read: if docId == "display";
      allow write: if docId == "display"
        && isSignedIn()
        && request.resource.data.mosque_name is string
        && isLanguage(request.resource.data.language)
        && isThemeMode(request.resource.data.theme_mode)
        && isTime(request.resource.data.auto_theme_start)
        && isTime(request.resource.data.auto_theme_end)
        && request.resource.data.updated_at is string;
    }

    match /donation/{docId} {
      allow read: if docId == "current";
      allow write: if docId == "current"
        && isSignedIn()
        && request.resource.data.weekly_amount is number
        && request.resource.data.weekly_amount >= 0
        && request.resource.data.currency == "GBP"
        && request.resource.data.donation_url is string
        && request.resource.data.updated_at is string;
    }

    match /prayerTimes/{docId} {
      allow read: if docId == "current";
      allow write: if docId == "current"
        && isSignedIn()
        && isIsoDate(request.resource.data.date)
        && isTime(request.resource.data.today.fajr)
        && isTime(request.resource.data.today.sunrise)
        && isTime(request.resource.data.today.dhuhr)
        && isTime(request.resource.data.today.asr)
        && isTime(request.resource.data.today.maghrib)
        && isTime(request.resource.data.today.isha)
        && (
          request.resource.data.tomorrow == null ||
          (
            isTime(request.resource.data.tomorrow.fajr) &&
            isTime(request.resource.data.tomorrow.sunrise) &&
            isTime(request.resource.data.tomorrow.dhuhr) &&
            isTime(request.resource.data.tomorrow.asr) &&
            isTime(request.resource.data.tomorrow.maghrib) &&
            isTime(request.resource.data.tomorrow.isha)
          )
        )
        && request.resource.data.updated_at is string;
    }

    match /dailyContent/{docId} {
      allow read: if docId == "current";
      allow write: if docId == "current"
        && isSignedIn()
        && request.resource.data.arabic is string
        && request.resource.data.translation.en is string
        && request.resource.data.translation.tr is string
        && request.resource.data.source is string
        && (request.resource.data.type == "ayah" || request.resource.data.type == "hadith")
        && request.resource.data.updated_at is string;
    }

    match /announcements/{announcementId} {
      allow read: if true;
      allow create, update: if isSignedIn()
        && request.resource.data.id == announcementId
        && request.resource.data.text.en is string
        && request.resource.data.text.tr is string
        && request.resource.data.active is bool
        && isIsoDateTimeOrNull(request.resource.data.expires_at)
        && request.resource.data.created_at is string
        && request.resource.data.updated_at is string;
      allow delete: if isSignedIn();
    }
  }
}
```

Notes:
- This draft intentionally uses simple string checks for timestamps. Tight timestamp enforcement can come later.
- If stricter schema enforcement is needed, add key whitelisting in a follow-up.
- Public reads are intentionally limited to the TV-facing data paths only.

## 5. Admin Write Permissions Strategy

MVP admin write model:
- Firebase Authentication Email/Password
- Any signed-in user can write
- No custom claims yet

Admin operations by path:
- `settings/display`: full overwrite or field merge
- `donation/current`: full overwrite or field merge
- `prayerTimes/current`: full overwrite or field merge
- `dailyContent/current`: full overwrite or field merge
- `announcements/{announcementId}`: create/update/delete

Recommended client write pattern:
- singleton documents use `setDoc(..., { merge: true })` only if partial updates are intentional
- otherwise prefer full typed writes so document shape stays predictable
- announcements use `setDoc` for create/update and `deleteDoc` for delete

## 6. Migration Path From Mock Data to Firestore

Phase order:

1. Keep `mockDisplayData` as the seed source of truth for first Firestore bootstrap only.
2. Add a Firestore display service that maps each document path to the existing TypeScript types.
3. Create a one-time seed script or admin bootstrap path that writes:
   - `settings/display`
   - `donation/current`
   - `prayerTimes/current`
   - `dailyContent/current`
   - initial `announcements`
4. Add `useDisplayData` abstraction for runtime source selection:
   - admin: authenticated writes + reads
   - tv: public reads only
5. Switch `/tv` read path from `mockDisplayData` to Firestore subscription only after:
   - seed data exists
   - rules are deployed
   - `/admin` writes are tested
6. Keep `mockDisplayData` in the repo as:
   - local dev fallback
   - test fixture
   - rollback fallback source

Recommended source transition:
- stage 1: `mock only`
- stage 2: `mock + Firestore seed`
- stage 3: `/admin` writes to Firestore, `/tv` still mock`
- stage 4: `/tv` reads Firestore with last-known cache`
- stage 5: Firestore becomes primary runtime source`

## 7. Rollback and Fallback Behavior

Rollback goal:
- if Firestore integration fails, `/tv` must not go blank and `/admin` must not corrupt local usability

Recommended fallback layers for `/tv`:

1. Primary: live Firestore snapshot data
2. Secondary: last known valid data cached in local storage
3. Tertiary: built-in `mockDisplayData`

Recommended behavior:
- If first Firestore load fails and cache exists:
  - show cached data
  - show small `Last updated` marker
- If first Firestore load fails and cache is missing:
  - show `mockDisplayData`
  - log the error
  - do not blank the layout
- If Firestore disconnects after a successful load:
  - keep the last valid in-memory data on screen
  - preserve countdown/UI timers locally

Recommended rollback switch:
- add one app-level data-source toggle later, for example:
  - `mock`
  - `firestore`
  - `firestore-with-fallback`

That allows reverting runtime reads without deleting the Firestore service code.

## 8. Risks and Decision Notes

Current spec mismatch already discovered:
- older project spec still shows `dailyContent.translation` as a single string
- current codebase now correctly uses localized translations:
  - `translation.en`
  - `translation.tr`

Important implementation risks:
- deploying rules before seeding can make the app look broken if documents are absent
- switching `/tv` to Firestore before last-known caching exists risks a blank public screen
- allowing public reads on all collections would be too broad; keep reads scoped to TV data only

## 9. Recommended Next Implementation Order

1. Add `src/services/firestoreDisplayService.ts`
2. Add a Firestore seed path from current mock data
3. Add Firestore read mapping for singleton documents and announcements
4. Connect authenticated `/admin` saves to Firestore
5. Add `/tv` Firestore subscriptions with cache fallback
6. Add deployment-time Firestore rules and manual seed verification
