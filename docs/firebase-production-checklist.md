# Firebase Production Setup Checklist

This checklist covers the first production-ready Firebase setup flow for the cami TV app.

It is documentation only. It does not change frontend runtime behavior.

## 1. Create or Confirm the Firebase Project

- Create the Firebase project in the Firebase console if it does not already exist.
- Confirm the correct project id for deployment and Admin SDK scripts.
- Register the web app and keep the Vite client values available for `.env`.

Required frontend env vars:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Required server/admin script env vars:

- `GOOGLE_APPLICATION_CREDENTIALS`
- `FIREBASE_PROJECT_ID`

## 2. Enable Email/Password Auth

- In Firebase console, open `Authentication`.
- Enable the `Email/Password` sign-in provider.

This is required for `/admin` sign-in.

## 3. Create Firestore Database

- In Firebase console, open `Firestore Database`.
- Create the database in production mode.
- Pick the intended region before continuing.

## 4. Deploy Firestore Rules

Rules file:

- [firestore.rules](/c:/Users/nacho/Desktop/cami%20tv%20app/firestore.rules)

Deploy command:

```bash
firebase deploy --only firestore:rules --project <your-project-id>
```

Current policy summary:

- `/tv`-facing display data is publicly readable
- public writes are denied
- writes require Firebase Auth plus `admin: true` custom claim

More detail:

- [docs/firestore-rules.md](/c:/Users/nacho/Desktop/cami%20tv%20app/docs/firestore-rules.md)

## 5. Seed Firestore Data

Seed command:

```bash
npm run seed:firestore
```

Optional overwrite:

```bash
npm run seed:firestore -- --force
```

What it creates:

- `settings/display`
- `donation/current`
- `prayerTimes/current`
- `dailyContent/current`
- `ticker/current`
- `announcements/{announcementId}`

More detail:

- [docs/firestore-seed.md](/c:/Users/nacho/Desktop/cami%20tv%20app/docs/firestore-seed.md)

## 6. Create or Sign Up the Admin User

- Create the intended admin user in Firebase Auth, or
- sign up through the enabled Email/Password flow if that is how you provision the account

At this point, sign-in alone is not enough for write access.

## 7. Assign the `admin: true` Custom Claim

This manual step is still required for the very first admin user.

Set claim:

```bash
npm run admin:set-claim -- --email someone@example.com
```

Remove claim if needed:

```bash
npm run admin:set-claim -- --email someone@example.com --remove
```

More detail:

- [docs/admin-custom-claims.md](/c:/Users/nacho/Desktop/cami%20tv%20app/docs/admin-custom-claims.md)

## 8. Deploy the Admin-Claim Callable Functions

This step is optional and requires the Firebase **Blaze** plan.

If the project stays on Spark/free, skip this step and keep `/admin` Admin Users disabled.

Deploy command:

```bash
firebase deploy --only functions:grantAdminClaim,functions:removeAdminClaim --project <your-project-id>
```

These functions allow existing admins to manage future admins from `/admin` without using the terminal.

## 9. Sign Out and Sign Back In

After changing custom claims, the user should:

- sign out and sign back in, or
- refresh their ID token

Without that refresh, `/admin` may still see the old token state.

## 10. Verify `/admin` Access

Check this sequence:

1. Unauthenticated user sees the login screen.
2. Signed-in user without `admin: true` sees the not-authorized screen.
3. Signed-in user with `admin: true` can access the admin editing UI.
4. If Spark/free is still in use, the `Admin Users` section shows a disabled Blaze/Functions notice.
5. If Blaze plus deployed functions are enabled, the `Admin Users` section can grant admin access by email.
6. If Blaze plus deployed functions are enabled, the `Admin Users` section can remove admin access by email.
7. Admin saves succeed without Firestore `permission-denied`.

## 11. Verify `/tv` Public Read and Realtime Updates

Check this sequence:

1. Open `/tv` without logging in.
2. Confirm TV content loads from Firestore when documents exist.
3. Change data from `/admin`.
4. Confirm `/tv` updates live without reload.
5. If a Firestore read fails or a section is missing, confirm `/tv` stays visible with safe fallback data.

## 12. Configure Automatic Prayer-Time Sync

Required server-side environment:

- `GOOGLE_APPLICATION_CREDENTIALS`
- `FIREBASE_PROJECT_ID`
- optional: `PRAYER_CITY`
- optional: `PRAYER_COUNTRY`
- optional: `PRAYER_TIMEZONE`
- optional: `PRAYER_METHOD`
- optional minute offsets:
  - `PRAYER_OFFSET_FAJR`
  - `PRAYER_OFFSET_SUNRISE`
  - `PRAYER_OFFSET_DHUHR`
  - `PRAYER_OFFSET_ASR`
  - `PRAYER_OFFSET_MAGHRIB`
  - `PRAYER_OFFSET_ISHA`

Default automatic source settings:

- city: `London`
- country: `United Kingdom`
- timezone: `Europe/London`
- method: `13`

Production command:

```bash
npm run prayer-times:sync
```

Safe verification command before touching production data:

```bash
PRAYER_SYNC_ALLOW_TEST_WRITE=true npm run prayer-times:verify-sync -- --allow-test-write
```

What the safe verification does:

- writes only to `prayerTimes/syncTest`
- verifies `manualOverride=false` updates effective top-level fields
- verifies `manualOverride=true` preserves manual effective fields and updates `automaticTimes`
- verifies a failed provider fetch leaves the test document unchanged

Firebase scheduled-function deployment:

- function name: `scheduledPrayerTimeSync`
- schedule: `10 0 * * *`
- timezone: `Europe/London`
- trigger: Google Cloud Scheduler through Firebase `onSchedule`

Billing and API checks:

- scheduled functions are billed and use Cloud Scheduler
- if the project is not already billing-enabled, upgrade it to Blaze before deployment
- confirm the `Cloud Scheduler API` is enabled in Google Cloud console
- if Blaze is not available, skip Firebase scheduled deployment and use the GitHub Actions fallback workflow instead

Deploy command:

```bash
firebase deploy --only functions:scheduledPrayerTimeSync --project <your-project-id>
```

Verification after deploy:

1. Confirm the deploy output includes `scheduledPrayerTimeSync`.
2. Confirm Google Cloud created the scheduler job automatically.
3. Wait for the next `00:10` Europe/London run, or trigger the job manually from the Cloud Scheduler console for an immediate check.
4. Inspect logs:

```bash
firebase functions:log --only scheduledPrayerTimeSync --project <your-project-id>
```

Expected results:

- success logs clearly indicate a sync to `prayerTimes/current`
- failure logs clearly indicate provider or validation failure
- failed runs must not write partial data

GitHub Actions no-Blaze fallback:

- workflow file: [prayer-times-sync.yml](/c:/Users/nacho/Desktop/cami%20tv%20app/.github/workflows/prayer-times-sync.yml)
- schedule: daily at `00:10` with `timezone: Europe/London`
- manual trigger: `workflow_dispatch`
- required GitHub repository secrets:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_SERVICE_ACCOUNT_JSON`
- workflow steps:
  - write the JSON secret to a temporary file on the runner
  - export `GOOGLE_APPLICATION_CREDENTIALS` to that temporary file path
  - run `npm ci`
  - run `npm run prayer-times:sync`
  - delete the temporary credential file after the job

When using the GitHub Actions fallback:

- do not commit credentials or service-account JSON files
- keep the workflow on the default branch so the schedule can run
- use `workflow_dispatch` for a manual smoke test after adding secrets

Security boundary:

- do not run the sync from the frontend
- do not expose Admin SDK credentials, service-account files, or scheduler controls to the client
- the deployed function and the CLI command use the same shared server-side sync logic

Rollback and failure behavior:

- failed provider fetches perform zero writes
- incomplete provider results perform zero writes
- `manualOverride=true` prevents automatic sync from overwriting the effective top-level prayer times
- disabling manual override later allows automatic times to take over again once stored automatic data exists

## 13. Common Failure Cases

### Admin signs in but sees `Not authorized`

Likely cause:

- the Firebase Auth user does not have `admin: true`
- or the user has not refreshed their token after claim assignment

Check:

- run `npm run admin:set-claim -- --email someone@example.com`
- then sign out and sign back in

### TV shows mock fallback

Likely cause:

- Firestore documents are missing
- rules are not deployed correctly
- Firestore read failed

Check:

- deploy rules
- run the seed script
- confirm the singleton docs and announcement docs exist

### Writes fail with `permission-denied`

Likely cause:

- signed-in user is authenticated but missing `admin: true`
- or Firestore rules are not the expected deployed version

Check:

- claim assignment
- token refresh
- rules deployment

### Seed script cannot find credentials

Likely cause:

- `GOOGLE_APPLICATION_CREDENTIALS` is unset
- or it points to the wrong service account JSON path

Check:

- local shell environment
- service account file path
- `FIREBASE_PROJECT_ID` if needed

### Vite chunk-size warning appears during build

Current status:

- non-blocking for now
- build still succeeds

This warning does not block Firebase deployment or first-run setup.
