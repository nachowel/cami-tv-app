# Checkpoint

## Completed tasks

- Scaffolded the Vite + React + TypeScript app and route split for `/tv` and `/admin`.
- Added shared display types and a mock dataset for settings, donation, prayer times, daily content, and announcements.
- Built the mock TV display shell with mosque header, live clock, prayer times panel, announcement area, daily content panel, and donation QR panel.
- Implemented prayer-time utilities for current/next prayer and countdown behavior, including after-Isha fallback to next-day Fajr.
- Implemented announcement filtering for `active` and `expires_at`.
- Added unit coverage for prayer-time logic and announcement filtering.
- Added a basic mock admin page with language toggle and daily-content length validation.

## Current accepted decisions

- Keep a mock-data-first workflow until the TV layout and core display behavior are stable.
- Preserve the product split: public read-only `/tv`, separate `/admin` management route.
- Use React + Vite + TypeScript + Tailwind CSS with React Router for the MVP.
- Support English and Turkish in the data model, with localized announcement text.
- Treat sunrise as a timetable event but not as a prayer target for current/next prayer logic.

## Known compromises

- The default Task Master store at `.taskmaster/tasks/tasks.json` is empty, so current tracking is effectively coming from `implementation_plan.md` and the codebase.
- `/admin` is still mock-only: no Firebase Auth, no Firestore writes, and no persistence beyond local component state.
- `/tv` still renders from static mock data: no real-time sync, no offline last-known cache, and no `Last updated` indicator yet.
- Theme mode exists in the data model but auto/light/dark behavior is not implemented.
- Some display content is still hardcoded or placeholder-driven, including date/Hijri labels, weather, and parts of the daily content copy.

## Next recommended task

- Finish the admin MVP against mock state: add editable sections for donation, announcements, prayer times, and theme mode so the full display dataset can be managed locally before Firebase/Auth integration.
