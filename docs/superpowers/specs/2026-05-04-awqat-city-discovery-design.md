# Awqat Salah City Discovery Design

## Goal

Add a server-side-only Awqat Salah city discovery flow that reuses the existing login path, fetches country/state/city data from the Awqat API, ranks likely London/Bexley candidates for human review, and prints only safe candidate fields. This phase must not write to Firestore or change TV/Admin/Aladhan behavior.

## Scope

Included:

- Extend the existing Awqat client with authenticated GET helpers for:
  - `/api/Place/Countries`
  - `/api/Place/States/{countryId}`
  - `/api/Place/Cities/{stateId}`
  - `/api/Place/CityDetail/{cityId}`
- Add a CLI script to log in, discover UK-related country/state/city candidates, rank them, and print a bounded shortlist.
- Add a manual-only GitHub Actions workflow to run the discovery script with repository secrets.
- Add docs for manual workflow usage and interpreting results.
- Add tests for country matching, candidate ranking, safe CLI behavior, and workflow presence.

Excluded:

- No Firestore reads or writes.
- No auto-selection or auto-save of `cityId`.
- No Awqat prayer-time fetch/save flow yet.
- No changes to TV components, admin manual save behavior, or Aladhan sync behavior.

## Architecture

The implementation keeps HTTP/auth behavior in `scripts/prayerTimes/awqatSalahClient.ts` and puts city matching/ranking in a separate pure helper module. The CLI composes those pieces: it logs in, fetches place data, ranks candidates, and prints a shortlist capped to avoid noisy workflow logs.

This split keeps the API client reusable for later Awqat phases while making matching logic deterministic and easy to test offline. The ranking rules are explicit: exact `London`, then names containing `London`, then `Bexley`-related names, then same-country/state fallbacks.

## Data Flow

1. Read `AWQAT_SALAH_USERNAME` and `AWQAT_SALAH_PASSWORD`.
2. Log in via `/Auth/Login`.
3. Fetch countries and identify UK-related country candidates using normalized name matching for `United Kingdom`, `UK`, and `England`.
4. Fetch states for matched countries.
5. Fetch cities for matched states.
6. Rank city candidates using the approved preference order.
7. Optionally fetch `CityDetail` for shortlisted candidates when it adds useful human-review context.
8. Print:
   - best match first
   - then up to 10 fallback candidates
   - never credentials, tokens, or raw auth responses

## Error Handling

- Missing credentials: fail with the existing safe env error.
- Login failure: fail with the existing safe login error.
- No UK/England country candidate: fail with a clear safe error.
- No London/Bexley candidate after successful discovery: print fallback candidates and clearly state that no preferred match was found.
- HTTP failures from place endpoints: throw safe endpoint/status errors without dumping raw payloads.

## Testing

- Unit test country matching for `United Kingdom`, `UK`, and `England` variants.
- Unit test ranked shortlist ordering for exact `London`, partial `London`, `Bexley`, and fallback candidates.
- Command test the discovery CLI with injected mock API responses and bounded fallback output.
- Workflow test the new manual-only discovery workflow.
- Existing full test suite and build must still pass.
