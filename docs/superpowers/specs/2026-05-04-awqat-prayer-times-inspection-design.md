# Awqat Salah Prayer Times Inspection Design

## Goal

Add a server-side-only inspection path that logs into Awqat Salah, fetches prayer-time data for locked city `14096 / LONDRA`, and prints a short sanitized summary of the real response shape and candidate prayer/date fields. This phase must not write to Firestore or change app behavior.

## Scope

Included:

- Extend the existing Awqat client with read-only methods for:
  - `/api/AwqatSalah/Daily/{cityId}`
  - `/api/AwqatSalah/Weekly/{cityId}`
  - `/api/AwqatSalah/Monthly/{cityId}`
- Add a CLI to inspect Daily for `14096` and optionally Monthly via `--monthly`
- Add a manual-only GitHub Actions workflow to run the inspection CLI
- Add docs for manual usage and interpreting the output
- Add tests for endpoint calls, sanitized CLI output, and workflow presence

Excluded:

- No Firestore writes
- No `prayerTimes/current` updates
- No final Firestore mapper design
- No TV/Admin changes
- No Aladhan behavior changes

## Architecture

The authenticated GET logic stays in `scripts/prayerTimes/awqatSalahClient.ts`. A dedicated inspection CLI will fetch the payloads and pass them through a small formatter that prints only response shape, top-level/sample keys, and candidate prayer/date fields.

This keeps inspection logic separate from later mapping logic. The CLI should help a human decide the final field mapping without silently baking assumptions into production code.

## Output

The CLI output should stay short and readable:

- inspection heading
- city id / city name context
- Daily response summary
- optional Monthly response summary when `--monthly` is present
- candidate keys and sample values for:
  - date
  - fajr / sabah
  - sunrise / gunes
  - dhuhr / ogle
  - asr / ikindi
  - maghrib / aksam
  - isha / yatsi

It must never print credentials, tokens, or the full raw payload.

## Error Handling

- Missing credentials: existing safe env error
- Login failure: existing safe login error
- Prayer-time endpoint failure: safe path/status error
- Unexpected payload shape: safe summary-level error without dumping raw response

## Testing

- Client tests prove Daily/Weekly/Monthly endpoints are called correctly with auth
- CLI tests prove output is sanitized and short
- Workflow test proves manual-only workflow exists and uses secrets
- Full unit suite and build must still pass
