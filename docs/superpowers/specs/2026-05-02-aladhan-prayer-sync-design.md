# Aladhan Prayer Sync Design

Date: 2026-05-02
Status: Approved for planning, pending implementation

## Goal

Add an Aladhan-based automatic prayer time sync that writes to Firestore, while keeping the TV display fully Firestore-backed and preserving manual admin edits as the higher-priority source when `manualOverride` is enabled.

This is a temporary provider integration until official Diyanet access is available. The implementation must stay modular so Aladhan can later be replaced by a different provider without changing the TV UI contract.

## Non-Goals

- Do not connect `/tv` directly to the Aladhan API.
- Do not change TV layout or styling beyond existing prayer-time rendering.
- Do not break existing Firestore display service functions.
- Do not remove manual admin prayer time editing.
- Do not introduce provider-specific logic into `/tv`.

## External Provider Configuration

Default Aladhan request:

`https://api.aladhan.com/v1/timingsByCity?city=London&country=United%20Kingdom&method=13`

Configurable provider inputs:

- `city`: default `London`
- `country`: default `United Kingdom`
- `timezone`: default `Europe/London`
- `method`: default `13`

These settings belong to the sync layer, not the TV route.

## Firestore Contract

The existing singleton path stays unchanged:

- `prayerTimes/current`

The top-level effective fields remain the TV-facing contract:

```ts
{
  date: IsoDate,
  today: PrayerTimesForDay,
  tomorrow: PrayerTimesForDay | null,
  updated_at: IsoDateTime,
  effectiveSource: "aladhan" | "manual"
}
```

The same document is extended with provider and override metadata:

```ts
{
  providerSource: "aladhan" | null,
  method: number | null,
  fetchedAt: IsoDateTime | null,
  manualOverride: boolean,
  offsets: {
    fajr: number,
    sunrise: number,
    dhuhr: number,
    asr: number,
    maghrib: number,
    isha: number
  },
  automaticTimes: {
    date: IsoDate,
    today: PrayerTimesForDay,
    tomorrow: PrayerTimesForDay | null
  } | null
}
```

## Data Ownership Rules

### TV read behavior

`/tv` must continue reading and displaying only the top-level effective fields:

- `date`
- `today`
- `tomorrow`
- `updated_at`
- `effectiveSource`

The TV does not need to know about `automaticTimes`, `manualOverride`, or provider fetch state.

### Legacy documents

Legacy `prayerTimes/current` documents that do not yet contain `manualOverride`, `effectiveSource`,
`automaticTimes`, or `offsets` must be treated as manual by default:

- `manualOverride = true`
- `effectiveSource = "manual"`
- `providerSource = null`

This default is a protection mechanism, not an automatic migration to provider-managed mode.
The system must not silently flip a legacy document to automatic mode in production.
An admin must intentionally disable manual override from `/admin` before provider-generated
timings can become the active effective schedule for that document.

### Manual admin save

When an admin manually saves prayer times:

- write top-level `date`, `today`, `tomorrow`, `updated_at`
- set `manualOverride = true`
- set `effectiveSource = "manual"`
- preserve `automaticTimes`
- preserve `providerSource`, `method`, `fetchedAt`, and `offsets`

Manual save is the active display source until manual override is disabled.

### Successful Aladhan sync

Every successful provider fetch must:

- normalize raw Aladhan timings
- apply configured minute offsets
- update `automaticTimes`
- update `providerSource = "aladhan"`
- update `method`
- update `fetchedAt`
- update `offsets`

If `manualOverride === false`, the sync must also:

- copy normalized values into top-level `date`, `today`, `tomorrow`
- update top-level `updated_at`
- set `effectiveSource = "aladhan"`

If `manualOverride === true`, the sync must not:

- overwrite top-level `date`, `today`, `tomorrow`, or `updated_at`
- change `effectiveSource` away from `"manual"`

### Disabling manual override

When admin disables manual override:

- set `manualOverride = false`
- if `automaticTimes` exists:
  - immediately copy `automaticTimes.date`, `automaticTimes.today`, and `automaticTimes.tomorrow` to the top level
  - set top-level `updated_at` to the time of this switch
  - set `effectiveSource = "aladhan"`
- if `automaticTimes` is null:
  - leave current top-level values unchanged
  - wait for the next successful provider sync to repopulate the effective fields

This transition must be an explicit admin action. Legacy documents must not reach this state
through implicit defaults, background migration, or first-sync behavior.

## Provider Normalization

Aladhan timings must be normalized into the internal prayer-time shape using:

- `fajr`
- `sunrise`
- `dhuhr`
- `asr`
- `maghrib`
- `isha`
- `date`

Normalization rules:

- strip timezone suffixes and extra text from Aladhan timings
- keep clean `HH:mm` values only
- apply minute offsets after cleanup and before saving
- derive `today` and `tomorrow` for the Firestore record

Normalized provider metadata:

- `providerSource = "aladhan"`
- `method = 13` by default
- `fetchedAt = current ISO timestamp`

## Offset Rules

Supported per-prayer offsets:

- `fajrOffset`
- `sunriseOffset`
- `dhuhrOffset`
- `asrOffset`
- `maghribOffset`
- `ishaOffset`

Storage shape in Firestore:

```ts
offsets: {
  fajr: number,
  sunrise: number,
  dhuhr: number,
  asr: number,
  maghrib: number,
  isha: number
}
```

Default all values to `0`.

Offsets are applied only to provider-generated timings. They do not mutate an admin-entered manual schedule.

## Failure Behavior

If Aladhan fetch fails:

- log the error clearly with provider context
- do not overwrite existing Firestore data
- do not clear `automaticTimes`
- do not alter top-level effective fields

This preserves the last valid Firestore state so `/tv` continues showing stable prayer times.

## Module Boundaries

### Provider module

Create a provider-oriented module that:

- fetches Aladhan data
- validates required fields
- normalizes raw timings into the internal shape
- applies offsets

This module must not know about TV rendering.

### Sync module or script

Create a server-side sync flow that:

- reads current `prayerTimes/current`
- fetches normalized provider times
- merges according to the manual-override rules
- saves back to Firestore only on successful provider fetch

This should be written so a future Diyanet provider can replace the Aladhan fetcher with minimal changes.

### Existing Firestore read path

Existing app reads should remain compatible. The Firestore service should continue returning the top-level effective fields needed by `/tv`, while tolerating the richer document shape.

## Testing Strategy

Required automated coverage:

1. successful Aladhan response normalization
2. `HH:mm` cleanup from provider timings containing suffixes or annotations
3. minute offset application
4. failed provider fetch does not overwrite current Firestore data
5. next-prayer calculation still works with normalized saved times
6. manual override merge rules:
   - sync updates top-level effective fields when `manualOverride` is `false`
   - sync preserves top-level effective fields when `manualOverride` is `true`
7. disabling manual override:
   - immediately restores top-level effective fields from `automaticTimes` when available
   - otherwise leaves current effective values until the next sync

## Risks and Constraints

- The current `PrayerTimesCurrent` TypeScript shape will need to expand without breaking existing consumers.
- Admin save behavior and sync behavior must share the same document contract or the data can drift.
- The effective top-level fields must stay stable because `/tv` depends on them directly.
- Firestore writes must be conservative: no destructive writes on fetch failure.

## Recommended Implementation Sequence

1. Expand the prayer-times data model to include effective/provider metadata.
2. Add failing tests for normalization, offsets, sync merge rules, and manual override switching.
3. Implement the Aladhan provider module.
4. Implement the sync merger and safe Firestore write flow.
5. Update any admin prayer-time save logic to preserve `automaticTimes` and metadata while asserting manual precedence.
6. Run unit tests, typecheck, and production build.
