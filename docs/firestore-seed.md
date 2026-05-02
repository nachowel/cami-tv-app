# Firestore Seed Script

This project includes a setup-only Firestore seed script for initial admin/production bootstrap.

It is not frontend runtime logic. `/tv` and `/admin` do not call this script.

## What It Creates

The script seeds Firestore from [src/data/mockDisplayData.ts](/c:/Users/nacho/Desktop/cami%20tv%20app/src/data/mockDisplayData.ts):

- `settings/display`
- `donation/current`
- `prayerTimes/current`
- `dailyContent/current`
- `ticker/current`
- `announcements/{announcementId}`

## Required Environment

The script uses the Firebase Admin SDK and requires server-side credentials.

Set:

- `GOOGLE_APPLICATION_CREDENTIALS`
  - Absolute path to a Firebase service account JSON file
- `FIREBASE_PROJECT_ID`
  - Optional if already present in the service account credentials
  - Falls back to `VITE_FIREBASE_PROJECT_ID` when available

These values are server/admin-only. Do not expose service account secrets to frontend code.

## Command

```bash
npm run seed:firestore
```

## Overwrite Behavior

Default behavior is safe:

- existing singleton docs are skipped
- existing announcement docs are skipped
- missing docs are created

That means rerunning the script does not create duplicate announcements, because announcements use stable document ids from the mock source.

## Force Overwrite

To overwrite existing Firestore docs with the current mock source:

```bash
npm run seed:firestore -- --force
```

`--force` changes behavior to:

- overwrite existing singleton docs
- overwrite existing announcement docs with matching ids
- still use the same stable announcement ids

## Intended Use

Use this script only for:

- first Firestore bootstrap
- controlled admin/setup operations
- reseeding a non-production or newly provisioned environment

Do not treat it as part of normal frontend runtime behavior.
