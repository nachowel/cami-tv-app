# ICMG Bexley TV Display System - Project Specification

## 1. Project Overview

The ICMG Bexley TV Display System is a mosque digital display system designed to run on Android TV through a browser or WebView. It provides a public information screen for mosque visitors and a simple admin panel for mosque staff.

The system has three main parts:

- **TV Display App (`/tv`)**: The public screen shown to the congregation.
- **Admin Panel (`/admin`)**: The authenticated management interface used by mosque staff.
- **Firebase Backend**: Firebase Auth plus Firestore-based real-time data synchronization.

The product must behave like a reliable public display, not a typical interactive app. Stability and clarity are more important than adding many features.

## 2. Core Principles

- Readability over aesthetics.
- Minimal interaction, maximum clarity.
- Real-time updates.
- Low maintenance for non-technical users.
- Reliable operation in real-world mosque conditions.

## 3. System Architecture

```text
Admin Panel (Phone, Firebase Auth)
        |
        v
Firebase Firestore
        |
        v
TV Display (Browser / Android TV, public read-only)
```

## 4. TV Display Requirements (`/tv`)

### 4.1 Layout Structure

The TV screen is divided into four primary areas.

### Left Area

- Mosque name: `ICMG Bexley`
- Optional logo placeholder
- Short donation message

### Center Area

- Large digital clock as the dominant visual element
- Gregorian date
- Hijri date
- Countdown to the next prayer
- Rotating daily ayah or hadith

### Right Area

Prayer times list:

- Imsak
- Gunes
- Ogle
- Ikindi
- Aksam
- Yatsi

The current and next prayer should be visually highlighted.

### Bottom Area

- Rotating announcements
- Weekly donation amount
- Donation QR code
- Website link

## 5. Feature Requirements

### 5.1 Clock

- Updates every second.
- Must be highly visible from distance.
- Must remain stable during long-running display sessions.

### 5.2 Prayer Times

- MVP uses manual entry through the admin panel.
- MVP stores today's prayer times.
- The structure is prepared for tomorrow's prayer times later.
- The display highlights current prayer and next prayer.
- The display shows time remaining to the next prayer.
- After Isha, the countdown points to the next day's Fajr.

### 5.3 Daily Content

- Supports Arabic and translation.
- Supports a source label such as `Nisa 31`.
- Supports content type: `ayah` or `hadith`.
- Uses short text for readability.
- Rotates every 10 to 15 seconds when multiple items exist.
- Admin can set content manually.
- Auto mode is reserved for a future phase.

### 5.4 Announcements

- Admin can add, edit, and delete announcements.
- Each announcement has text and an optional expiry date.
- Each announcement also has `active`, `created_at`, and `updated_at`.
- Expired announcements should not appear on the TV display.
- Active announcements rotate on the bottom area.

### 5.5 Donation Display

- Shows weekly donation amount, such as `GBP 750`.
- Generates QR code dynamically from donation URL.
- Shows a short message: `Support our mosque`.
- Donation URL is editable from the admin panel.

## 6. Theme System

Theme mode supports:

```text
auto | light | dark
```

### Auto Mode

Auto mode is the default.

- 08:00 to 18:00: light theme
- 18:00 to 08:00: dark theme
- Auto start and end times are fixed for MVP but stored in a way that can become configurable later.

### Manual Override

Admin can force:

- Light theme
- Dark theme

### Theme Rules

- Theme changes must apply without page reload.
- Themes must not be simple color inversions.
- Light and dark themes must be designed separately for readability.

## 7. Admin Panel Requirements (`/admin`)

The admin panel must be simple enough for non-technical mosque staff.

### Authentication

- `/admin` requires Firebase Auth login in MVP.
- `/tv` remains public and read-only.
- MVP supports authorized admin users only.
- Complex roles and permissions are out of scope for MVP.

### Admin Features

- Update weekly donation amount.
- Update donation URL.
- Add, edit, delete announcements.
- Set announcement expiry dates.
- Enter daily prayer times manually.
- Edit ayah/hadith Arabic text, translation, source, and type.
- Toggle future auto mode for daily content.
- Select theme mode: auto, light, or dark.

## 8. Firestore Data Model

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

## 9. Offline and Fallback Behavior

- The TV display caches the last known valid data locally.
- If Firebase is temporarily unavailable, `/tv` keeps showing the last known data.
- The TV display shows a small `Last updated` timestamp.
- The TV display must never show a blank screen because of network or Firebase failures.

## 10. Technical Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Firebase Auth and Firestore
- Hosting: Vercel
- TV mode: Browser first
- Fallback: Android TV WebView app

## 11. Development Phases

### Phase 1: MVP

- TV UI with mock data.
- Admin UI with mock data.
- Firebase Auth for `/admin`.
- Layout finalization.

### Phase 2: Firebase Integration

- Firestore data structure.
- Real-time subscriptions.
- Admin write operations.
- Last known data cache for `/tv`.

### Phase 3: Display Logic

- Theme system.
- QR generation.
- Countdown logic.
- Announcement expiry filtering.

### Phase 4: Optional

- Diyanet API integration.
- Auto ayah/hadith.
- Advanced scheduling.

## 12. Non-Goals

- Payment processing system.
- Multi-mosque support.
- Complex user roles.
- Native mobile app.
- Play Store publishing.

## 13. TV QA Checklist

- 1920x1080 viewport check.
- 3m readability check.
- 5m readability check.
- Daylight readability check.
- Android TV browser test.
- Fullscreen test.
- TV sleep mode check.
- Internet disconnect fallback check with last cached data.
- Confirm the TV never shows a blank screen during temporary data failures.
- Confirm `Last updated` timestamp is visible but unobtrusive.

## 14. Success Criteria

- Admin updates reflect instantly on TV.
- `/admin` requires login.
- `/tv` remains public and read-only.
- Screen is readable from distance.
- Daily operation requires no technical intervention.
- System runs stably on Android TV.
- TV keeps showing last known data during temporary Firebase or network failures.

## 15. Future Enhancements

- Multi-language support.
- Ramadhan mode with iftar countdown.
- Event calendar.
- Remote monitoring.
- Configurable auto theme start/end times.
