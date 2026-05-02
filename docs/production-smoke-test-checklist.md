# Production Smoke-Test Checklist

Use this checklist after deploying the Vercel frontend and completing the Firebase production setup.

This is documentation only. It does not change frontend runtime behavior.

## Public TV Checks

1. Open `/tv` without logging in.
2. Confirm `/tv` loads publicly.
3. Confirm the displayed content comes from seeded Firestore data, not mock fallback data.
4. Confirm prayer times, donation details, daily content, and announcements match the seeded Firestore documents.

## Admin Access Checks

5. Open `/admin`.
6. Confirm the login screen appears for unauthenticated users.
7. Sign in with a Firebase user that does **not** have `admin: true`.
8. Confirm the signed-in non-admin user is blocked with the not-authorized screen.
9. Sign out.
10. Sign in with a Firebase user that **does** have `admin: true`.
11. Confirm the admin user can access the full admin panel.

## Firestore Write and Realtime Checks

12. Update one admin-managed value from `/admin`, such as:
   - language
   - donation amount
   - donation URL
   - announcement text
   - prayer time
   - daily content
13. Confirm the admin save succeeds and Firestore updates.
14. Open `/tv` in another tab or device.
15. Confirm `/tv` updates in realtime after the admin save without a reload.

## Security Checks

16. Attempt a public Firestore write without authentication.
17. Confirm Firestore rules deny the public write.
18. Attempt a write with a signed-in user that lacks `admin: true`.
19. Confirm Firestore rules deny that write as well.

## Seed Script Safety Check

20. Rerun the seed script without `--force`:

```bash
npm run seed:firestore
```

21. Confirm the script skips existing documents.
22. Confirm announcement documents are not duplicated.

## Known Non-Blocking Issue

23. The Vite chunk-size warning may still appear during build.

Current status:

- non-blocking for now
- build still succeeds
- deployment validation can continue

## Offline and Fallback Checks

24. Disable Firestore temporarily using browser offline mode or network blocking.
25. Reload `/tv`.
26. Confirm fallback data renders correctly without a crash or blank screen.

## Admin Claim Refresh Checks

27. After assigning `admin: true`, do **not** log out immediately.
28. Wait for token refresh or manually refresh the page.
29. Confirm the admin panel becomes accessible only after the refreshed token is in use.

## Slow-Network Startup Checks

30. Open `/tv` with Chrome throttling enabled, for example `Slow 3G`.
31. Confirm no blank screen appears before Firestore-backed data or fallback data finishes loading.

## Dev Snapshot Logging Checks

32. In development mode, log Firestore snapshot timestamps.
33. Confirm a realtime update actually triggers a new snapshot event rather than only a local UI update.

## Rapid Save Checks

34. Try editing admin data rapidly with multiple saves in sequence.
35. Confirm there is no inconsistent UI state, stale success state, or obvious race condition.

## Console and Error Visibility Checks

36. Open the browser console on `/tv`.
37. Confirm there are no uncaught errors during initial load.

38. Temporarily remove the `admin: true` claim or otherwise trigger a Firestore permission error from `/admin`.
39. Confirm the error is visible in console output and/or app logs, and that the UI does not crash.

## Firestore Network and Subscription Checks

40. Open the network tab and inspect Firestore-related requests.
41. Confirm there are no excessive re-subscriptions, rapid reconnect loops, or obviously repeated request bursts during normal idle use.

42. Leave `/tv` open for 10 or more minutes.
43. Confirm there are no signs of memory leaks, runaway timers, or repeated subscription logs over time.

## Hard Refresh Check

44. Hard refresh `/tv` with `Ctrl+Shift+R`.
45. Confirm the app still initializes correctly and does not depend on stale cached state to render.

## Recovery Verification Notes

46. Firestore recovery verification for `/tv` was verified locally by blocking Firestore traffic instead of using a full browser-offline reload.
47. Browser offline mode was not used for the reload check because localhost dev-server HTML also becomes unavailable when the browser is fully offline.
48. Local recovery verification confirmed the Firestore-specific fallback path without changing runtime behavior.

49. Subscription recovery was verified with an already-open `/tv` tab and an offline-to-online browser toggle.
50. During that check, Firestore `Listen` failed with `ERR_INTERNET_DISCONNECTED`, then recovered with `200` responses after network return.
51. The `/tv` subscription reconnected without a manual refresh.

52. The long-idle `/admin` to `/tv` realtime verification was blocked in this session because no admin credentials or admin write path were available.
53. Final production verification for the long-idle reconnect path still requires a real admin-triggered Firestore write after the idle period.

Short note:
For 52-53, final production verification requires an `admin:true` user and a real Firestore-backed admin save after 10+ minutes idle.

## Related Docs

- [docs/deployment-guide.md](/c:/Users/nacho/Desktop/cami tv app/docs/deployment-guide.md)
- [docs/firebase-production-checklist.md](/c:/Users/nacho/Desktop/cami tv app/docs/firebase-production-checklist.md)
- [docs/firestore-rules.md](/c:/Users/nacho/Desktop/cami tv app/docs/firestore-rules.md)
- [docs/firestore-seed.md](/c:/Users/nacho/Desktop/cami tv app/docs/firestore-seed.md)
- [docs/admin-custom-claims.md](/c:/Users/nacho/Desktop/cami tv app/docs/admin-custom-claims.md)
