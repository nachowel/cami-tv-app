# Admin Custom Claims

This project now supports two safe server-side paths for managing the Firebase custom `admin` claim:

- the existing one-time script for bootstrapping the first admin
- Firebase callable functions used by the `/admin` UI for future admin management

Neither path exposes the Firebase Admin SDK or service account credentials to frontend code.

## First Admin Bootstrap

The first `admin:true` user still needs to be created manually once with the script below.

After that, signed-in admins can grant or remove admin access from `/admin` only if callable functions are deployed and the Firebase project is on the Blaze plan.

## Required Environment

Set these environment variables before running the script:

- `GOOGLE_APPLICATION_CREDENTIALS`
  - Absolute path to a Firebase service account JSON file
- `FIREBASE_PROJECT_ID`
  - Optional if already available through the service account credentials
  - Falls back to `VITE_FIREBASE_PROJECT_ID` when present

## Set Admin Claim

```bash
npm run admin:set-claim -- --email someone@example.com
```

This command:

- validates the email argument
- finds the Firebase Auth user by email
- preserves existing custom claims
- sets only `admin: true`

## Remove Admin Claim

```bash
npm run admin:set-claim -- --email someone@example.com --remove
```

This command:

- validates the email argument
- finds the Firebase Auth user by email
- preserves other existing custom claims
- removes only the `admin` claim

## Deploy Admin-Claim Functions

The callable-function path requires the Firebase **Blaze** plan. Spark/free plan projects cannot use it in production.

If the project is upgraded to Blaze, deploy the callable functions that power the `/admin` Admin Users section:

```bash
firebase deploy --only functions:grantAdminClaim,functions:removeAdminClaim --project <your-project-id>
```

Callable behavior:

- only signed-in callers with `request.auth.token.admin === true` are allowed
- user lookup happens server-side by email
- existing custom claims are preserved
- only the `admin` claim is added or removed
- responses do not include tokens or private credential data

## Safety Notes

- The bootstrap script uses the Firebase Admin SDK only in `scripts/`.
- The `/admin` runtime flow calls Firebase callable functions only when that optional feature is explicitly enabled.
- It does not expose service account secrets to frontend code.
- It does not overwrite unrelated custom claims.
- It prints clear success and error messages.

## Current Production Guidance

If the project remains on the Firebase Spark/free plan:

- keep the `/admin` Admin Users section disabled
- use `npm run admin:set-claim -- --email someone@example.com`
- use `npm run admin:set-claim -- --email someone@example.com --remove` when needed

## Token Refresh Note

After changing claims, the user may need to:

- sign out and sign back in, or
- refresh their ID token

Until that happens, the client may still have an old token without the updated claim state.
