# Firestore Security Rules

This project uses [firestore.rules](/firestore.rules) for Firestore access control.

These rules are deployment/admin configuration only. They are not frontend runtime logic.

## Access Model

| Path | Public Read | Admin Write |
|---|---|---|
| `settings/display` | Yes | Yes |
| `settings/prayerTimes` | No | Yes |
| `donation/current` | Yes | Yes |
| `prayerTimes/current` | Yes | Yes |
| `dailyContent/current` | Yes | Yes |
| `ticker/current` | Yes | Yes |
| `announcements/{announcementId}` | Yes | Yes |
| All other paths | No | No |

- **Public read**: Unauthenticated clients (TV display) can read the public display documents only.
- **Admin write**: Only authenticated Firebase users with the `admin: true` custom claim can write.
- **Admin-only settings**: `settings/prayerTimes` is readable and writable only by admins. The current TV display does not need this document.
- **Deny all**: Every other read and write is denied by the catch-all rule.

### Admin Claim Requirement

The `isAdmin()` rule function checks two conditions:

1. `request.auth != null` — the request is from a signed-in user
2. `request.auth.token.admin == true` — the user's ID token has the `admin: true` custom claim

Signing in to Firebase Auth is not sufficient for writes. The user must also have the `admin: true` custom claim, which must be set server-side with the Firebase Admin SDK.

## Token Refresh Behavior

When the `/admin` panel loads, the app checks the ID token for `admin: true`. If the claim is not present in the cached token, the app force-refreshes the token once per session to pick up recent claim changes. This covers the common case where an admin claim was just granted but the cached token does not yet reflect it.

If a Firestore write still fails with a permission error, the app now detects `permission-denied` errors and surfaces a message suggesting the user re-login. This covers edge cases where the token becomes stale during a session.

## Deployment

The local `firestore.rules` file must be deployed to Firebase before the rules take effect. Until deployment, the live database uses whatever rules were previously deployed, which may not include all paths listed above.

Deploy the current rules:

```bash
firebase deploy --only firestore:rules --project <your-project-id>
```

Because [firebase.json](/firebase.json) points Firestore to `firestore.rules`, the command above deploys this rules file.

### Deployment Checklist

After adding or changing Firestore paths (e.g. `settings/prayerTimes`):

1. Confirm the path is listed in `firestore.rules` with the intended access model.
2. Confirm the path is listed in `FIRESTORE_PATHS` in `src/shared/firestorePaths.ts`
3. Run `firebase deploy --only firestore:rules --project <your-project-id>`
4. Verify on the Firebase Console that the deployed rules match the local file
5. Open `/tv` without logging in and confirm Firestore-backed public data loads
6. Sign in as an admin user and confirm reads and writes succeed, including `settings/prayerTimes`
7. Sign in as a non-admin user and confirm protected writes are denied

## Admin Claim Provisioning

Use [docs/admin-custom-claims.md](/docs/admin-custom-claims.md) and the `npm run admin:set-claim` script to assign or remove the `admin` custom claim.

The `/admin` UI also has an Admin Users section (when enabled) that uses Firebase callable functions to manage claims.

## Verification Steps

There is no emulator-based Firebase rules test harness in this repo. Verify manually after deploy:

1. Open `/tv` without logging in and confirm the display reads Firestore-backed content.
2. Attempt an unauthenticated Firestore write and confirm it is denied.
3. Sign in with a Firebase user that does not have the `admin` custom claim and confirm admin writes fail with `permission-denied`.
4. Sign in with a Firebase user that does have the `admin` custom claim and confirm admin writes succeed.
5. Confirm documents outside the approved paths are not publicly readable or writable.
