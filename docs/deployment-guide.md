# Deployment Guide

This app is currently best prepared for:

- **Frontend hosting:** Vercel
- **Backend services:** Firebase Auth + Firestore

That keeps the Vite frontend deployment simple while Firebase continues to provide authentication, Firestore data, rules, seed tooling, and admin-claim tooling.

## Deploy Target Recommendation

Recommended deployment target:

- **Vercel for the frontend**

Reason:

- the app already builds as a static Vite SPA
- output is the standard `dist/` directory
- Firebase is already being used only as a managed backend service
- [vercel.json](/c:/Users/nacho/Desktop/cami%20tv%20app/vercel.json) now provides SPA rewrites so `/tv` and `/admin` can refresh correctly

Firebase Hosting remains a possible future path, but it is not the path prepared here.

## Build Settings

Build command:

```bash
npm run build
```

Output directory:

```bash
dist
```

## Frontend Environment Requirements

Required Vite env vars for the deployed frontend:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

These must be set in the deployment platform for the frontend build/runtime environment.

Reference:

- [\.env.example](/c:/Users/nacho/Desktop/cami%20tv%20app/.env.example)

## Script / Admin Tooling Environment Requirements

These are **not** frontend env vars. They are required only for local/admin/server-side scripts such as seed and first-admin claim assignment:

- `GOOGLE_APPLICATION_CREDENTIALS`
- `FIREBASE_PROJECT_ID`

Used by:

- `npm run seed:firestore`
- `npm run admin:set-claim -- --email someone@example.com`
- `npm run prayer-times:sync`
- `npm run prayer-times:verify-sync -- --allow-test-write`

## Automatic Prayer-Time Sync

The automatic prayer-time writer is server-side only. It is available through:

- the local/admin CLI command `npm run prayer-times:sync`
- the Firebase scheduled function `scheduledPrayerTimeSync`
- the GitHub Actions fallback workflow [prayer-times-sync.yml](/c:/Users/nacho/Desktop/cami%20tv%20app/.github/workflows/prayer-times-sync.yml)

`/tv` does not call Aladhan directly and continues to read only from Firestore. No scheduler logic, Admin SDK credentials, or provider secrets are exposed to the client.

Production sync command:

```bash
npm run prayer-times:sync
```

Safe verification command against the staging-style test document:

```bash
PRAYER_SYNC_ALLOW_TEST_WRITE=true npm run prayer-times:verify-sync -- --allow-test-write
```

Verification target:

- `prayerTimes/syncTest`

Production target:

- `prayerTimes/current`

Required server-side environment:

- `GOOGLE_APPLICATION_CREDENTIALS`
- `FIREBASE_PROJECT_ID`
- optional: `PRAYER_CITY`
- optional: `PRAYER_COUNTRY`
- optional: `PRAYER_TIMEZONE`
- optional: `PRAYER_METHOD`
- optional: `PRAYER_OFFSET_FAJR`
- optional: `PRAYER_OFFSET_SUNRISE`
- optional: `PRAYER_OFFSET_DHUHR`
- optional: `PRAYER_OFFSET_ASR`
- optional: `PRAYER_OFFSET_MAGHRIB`
- optional: `PRAYER_OFFSET_ISHA`

Default provider values if the optional vars are omitted:

- city: `London`
- country: `United Kingdom`
- timezone: `Europe/London`
- method: `13`

Scheduled Firebase function:

- function name: `scheduledPrayerTimeSync`
- schedule: `10 0 * * *`
- timezone: `Europe/London`
- trigger: Google Cloud Scheduler through Firebase `onSchedule`

Billing and API requirements:

- Scheduled functions are billed and depend on Cloud Scheduler.
- If the project is not already billing-enabled, upgrade it to Blaze before deploying the scheduler-backed function.
- Confirm the `Cloud Scheduler API` is enabled in the Google Cloud console for the Firebase project.
- If the project cannot use Blaze, use the GitHub Actions fallback instead of deploying the scheduler-backed Firebase function.

Deploy the scheduled function:

```bash
firebase deploy --only functions:scheduledPrayerTimeSync --project <your-project-id>
```

Deploy it together with the optional admin-claim callables if needed:

```bash
firebase deploy --only functions:scheduledPrayerTimeSync,functions:grantAdminClaim,functions:removeAdminClaim --project <your-project-id>
```

Verify deployment and scheduled execution:

1. Confirm the deploy output includes `scheduledPrayerTimeSync`.
2. Confirm Google Cloud created the scheduler job automatically for the function.
3. Wait for the next `00:10` Europe/London run, or trigger the job manually from the Cloud Scheduler console for an immediate check.
4. Inspect logs:

```bash
firebase functions:log --only scheduledPrayerTimeSync --project <your-project-id>
```

Expected logging:

- success logs clearly state the sync wrote `prayerTimes/current`
- failure logs clearly state the provider or validation failure

CLI fallback:

- `npm run prayer-times:sync` still runs the exact same shared sync logic as the scheduled function
- keep any Admin SDK credentials server-side only

GitHub Actions no-Blaze fallback:

- workflow file: [prayer-times-sync.yml](/c:/Users/nacho/Desktop/cami%20tv%20app/.github/workflows/prayer-times-sync.yml)
- triggers:
  - daily scheduled run at `00:10` with `timezone: Europe/London`
  - manual `workflow_dispatch`
- required repository secrets:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_SERVICE_ACCOUNT_JSON`
- runtime behavior:
  - writes the service account JSON to a temporary file on the runner
  - sets `GOOGLE_APPLICATION_CREDENTIALS` to that temporary path
  - runs `npm ci`
  - runs `npm run prayer-times:sync`
  - removes the temporary credential file at the end of the job
- do not commit service-account JSON files or any other credentials to the repository

Failure and rollback behavior:

- If the Aladhan fetch fails, the sync writes nothing.
- If the provider result is missing either `today` or `tomorrow`, the sync writes nothing.
- If `manualOverride === true`, sync refreshes `automaticTimes` only and preserves the current effective top-level fields.
- If `manualOverride === false`, sync updates both `automaticTimes` and the effective top-level fields.
- The verification command never targets `prayerTimes/current` and refuses to write even to `prayerTimes/syncTest` unless `PRAYER_SYNC_ALLOW_TEST_WRITE=true` or `--allow-test-write` is explicitly provided.

## Optional Firebase Functions Deployment

The `/admin` Admin Users section is currently optional and should stay disabled unless:

- the Firebase project is on the **Blaze** plan
- these callable functions are deployed:
  - `grantAdminClaim`
  - `removeAdminClaim`
- the frontend env var `VITE_ENABLE_ADMIN_USER_MANAGEMENT=true` is set

Spark/free plan projects cannot use this feature in production.

If you later upgrade to Blaze, deploy them with:

```bash
firebase deploy --only functions:grantAdminClaim,functions:removeAdminClaim --project <your-project-id>
```

Until then, admins must be added or removed with the existing local script.

## Deployment Steps

1. Configure the Firebase project, Firestore, rules, seed data, and admin claims using:
   - [docs/firebase-production-checklist.md](/c:/Users/nacho/Desktop/cami%20tv%20app/docs/firebase-production-checklist.md)
2. Configure the four required `VITE_FIREBASE_*` env vars in Vercel.
3. Leave `VITE_ENABLE_ADMIN_USER_MANAGEMENT` unset or `false` unless the project has Blaze plus deployed callable functions.
4. If you want automatic daily prayer-time sync on Blaze, deploy `functions:scheduledPrayerTimeSync`.
5. If Blaze is unavailable, configure the GitHub Actions workflow secrets and enable the fallback workflow schedule.
6. Deploy the frontend with build command `npm run build`.
7. Confirm the deployed site serves the Vite output from `dist/`.

## Post-Deploy Smoke Test

After deployment:

1. Open `/tv` without logging in.
2. Confirm `/tv` loads publicly.
3. Open `/admin`.
4. Confirm login works with Firebase Email/Password.
5. Confirm a user without `admin: true` is blocked with the not-authorized screen.
6. Confirm a user with `admin: true` can open the admin panel.
7. Confirm the `Admin Users` section is either disabled with a Blaze/Functions notice or intentionally enabled only on Blaze with deployed functions.
8. Save a Firestore-backed content change from `/admin`.
9. Confirm Firestore accepts the write.
10. Confirm `/tv` updates in realtime.

## Current Non-Blocking Build Warning

The current production build emits a Vite chunk-size warning.

Current status:

- **non-blocking for now**
- build still succeeds
- deployment can proceed

This should be optimized later, but it does not block deployment readiness today.
