# Scope: ICMG Bexley TV Display System

**Date:** 2026-05-01  
**Status:** Approved input scope from project specification  
**Primary goal:** Build a reliable mosque public display system for Android TV/browser with a simple admin panel and Firebase real-time sync.

## Problem

ICMG Bexley needs a low-maintenance digital display for mosque visitors. The TV must show the current time, prayer times, donation information, announcements, and short religious content in a format that remains readable from a distance. Mosque staff need a simple admin panel that can update content without technical support.

## In Scope

- TV display route at `/tv`
- Admin route at `/admin`
- React + Vite + TypeScript + Tailwind frontend
- Firebase Firestore backend for real-time content sync
- Firebase Auth for `/admin` in MVP
- Public read-only `/tv` route
- Authorized admin users only; no complex roles in MVP
- Manual prayer-time management in MVP
- Today's prayer times, with structure prepared for tomorrow's prayer times later
- Large live clock and date display
- Gregorian and Hijri date display
- Countdown to next prayer, including next-day Fajr after Isha
- Current and next prayer highlighting
- Rotating ayah/hadith content
- Rotating announcements with optional expiry dates
- Weekly donation amount, donation URL, QR code, and website link
- Theme mode system: `auto`, `light`, `dark`
- Default theme mode: `auto`
- Auto theme schedule: light from 08:00 to 18:00, dark from 18:00 to 08:00
- Theme structure prepared for configurable auto start/end times later
- TV fallback behavior with last known data when Firebase is temporarily unavailable
- Small `Last updated` timestamp on the TV display
- Vercel hosting
- Browser-first Android TV support, with WebView fallback later

## Out of Scope

- Payment processing
- Multi-mosque support
- Complex user roles
- Native mobile app
- Play Store publishing
- Diyanet API integration in MVP
- Auto ayah/hadith feed in MVP
- Advanced event scheduling in MVP

## Success Criteria

- Admin updates appear on the TV without a reload.
- The TV screen is readable from typical mosque viewing distance.
- Staff can update prayer times, announcements, donation details, daily content, and theme mode without technical knowledge.
- `/admin` requires login through Firebase Auth.
- `/tv` remains public and read-only.
- The system can run stably in a browser or Android TV WebView.
- Theme changes apply live and are not simple color inversions.
- TV shows last known data and never renders a blank screen if Firebase is temporarily unavailable.
- TV shows a small `Last updated` timestamp.
- MVP can operate fully with mock data before Firebase is connected.

## Core Architecture

```text
Admin Panel (/admin, Firebase Auth)
        |
        v
Firebase Firestore
        |
        v
TV Display (/tv, public read-only)
```

## Data Model

```text
settings/display
donation/current
prayerTimes/current
dailyContent/current
announcements/{announcementId}
```

### `settings/display`

```json
{
  "mosque_name": "ICMG Bexley",
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
  "arabic": "Short Arabic text",
  "translation": "Short translated text",
  "source": "Nisa 31",
  "type": "ayah",
  "updated_at": "2026-05-01T18:00:00Z"
}
```

### `announcements/{announcementId}`

```json
{
  "id": "announcementId",
  "text": "Cuma namazi 13:15",
  "active": true,
  "expires_at": "2026-06-01T23:59:59Z",
  "created_at": "2026-05-01T18:00:00Z",
  "updated_at": "2026-05-01T18:00:00Z"
}
```

## Product Phases

### Phase 1: MVP With Mock Data

- Build `/tv` layout with mock data.
- Build `/admin` layout with mock state.
- Add Firebase Auth login requirement for `/admin`.
- Finalize responsive TV-first layout.
- Validate readability and spacing.

### Phase 2: Firebase Sync

- Add Firestore collections/documents.
- Subscribe TV route to real-time changes.
- Persist admin edits to Firestore.
- Cache last known TV data for temporary Firebase failures.

### Phase 3: Display Logic

- Add theme system.
- Add QR generation.
- Add prayer countdown and highlight logic.
- Add expiry filtering for announcements.

## TV QA Checklist

- 1920x1080 viewport check.
- 3m readability check.
- 5m readability check.
- Daylight readability check.
- Android TV browser test.
- Fullscreen test.
- TV sleep mode check.
- Internet disconnect fallback check using last cached data.
- Confirm the TV never shows a blank screen during temporary data failures.
- Confirm `Last updated` timestamp is visible but unobtrusive.

### Phase 4: Optional Enhancements

- Diyanet API integration.
- Auto ayah/hadith mode.
- Ramadhan mode.
- Event calendar.
- Remote monitoring.
