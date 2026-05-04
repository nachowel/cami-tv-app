# Awqat Salah Mapper Phase 2D Design

## Goal

Design a pure, timezone-safe Awqat Salah mapper that converts confirmed Awqat prayer-time payloads into the existing `prayerTimes/current` document shape without writing to Firestore and without changing TV, Admin, or Aladhan behavior.

Confirmed Awqat input fields:

- `fajr`
- `sunrise`
- `dhuhr`
- `asr`
- `maghrib`
- `isha`
- `gregorianDateLongIso8601`

Confirmed locked city for inspection and later integration:

- `cityId: 14096`
- `cityName: LONDRA`

## Non-Goals

- No Firestore writes
- No sync-runner integration yet
- No changes to `prayerTimes/current` field names
- No TV behavior changes
- No Admin behavior changes
- No Aladhan behavior changes
- No parallel Awqat-specific schema

## Existing Schema And Semantics

The current `PrayerTimesCurrent` shape already carries both effective display values and automatic-provider metadata:

- `date`
- `today`
- `tomorrow`
- `updated_at`
- `effectiveSource`
- `providerSource`
- `method`
- `fetchedAt`
- `manualOverride`
- `offsets`
- `automaticTimes`
- optional `validationStatus`

Current sync semantics, as established by the existing Aladhan path:

1. Provider sync always refreshes provider metadata and `automaticTimes`.
2. If `manualOverride === false`, the top-level effective fields are replaced with provider values.
3. If `manualOverride === true`, the top-level effective fields stay manual and only provider metadata / `automaticTimes` are refreshed.
4. Legacy documents that only contain `"manual"` / `"aladhan"` must continue to parse safely.

Phase 2D must preserve these semantics.

## Narrow Type Changes

The mapper design requires a narrow extension of the existing source unions so Awqat can be represented in the current schema without adding new fields.

Required type updates:

- `PrayerTimeSource` becomes:
  - `"manual" | "aladhan" | "awqat-salah"`
- `PrayerTimeSourceSetting` should remain backward-compatible and may collapse to the same union if convenient.
- `PrayerTimesCurrent.providerSource` becomes:
  - `"aladhan" | "awqat-salah" | null`

Backward-compatibility rules:

- Existing documents containing `"manual"` or `"aladhan"` remain valid and unchanged.
- Missing or unknown legacy source values continue to normalize conservatively, matching current behavior.
- No field names are renamed.
- No parallel source metadata fields are introduced.

## Pure Mapper Contract

Phase 2D should add a pure function:

```ts
mapAwqatToPrayerTimesDocument(input): PrayerTimesCurrent
```

Recommended input shape:

```ts
interface AwqatPrayerTimeDayInput {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  gregorianDateLongIso8601: string;
}

interface MapAwqatToPrayerTimesDocumentInput {
  current: PrayerTimesCurrent;
  today: AwqatPrayerTimeDayInput;
  tomorrow?: AwqatPrayerTimeDayInput | null;
  fetchedAt: string;
}
```

Why `current` is part of the pure input:

- the mapper must preserve `manualOverride` semantics
- the mapper must preserve existing `offsets`
- the mapper must preserve current effective top-level fields when manual override is active
- the mapper must stay pure and testable without performing any reads itself

## Timezone Design

This is the critical part of Phase 2D.

### Prayer Clock Interpretation

`gregorianDateLongIso8601` must still be parsed as a full datetime including its embedded offset, for example `+03:00`.

However, the confirmed Phase 2D rule is:

- `fajr`
- `sunrise`
- `dhuhr`
- `asr`
- `maghrib`
- `isha`

must be treated as already-local prayer clock times for the selected city (`LONDRA`), not as source-offset times that need timezone conversion.

That means:

1. Parse `gregorianDateLongIso8601` as structured date metadata.
2. Use it only to derive or validate the calendar date for the payload.
3. Preserve each prayer field exactly as the Awqat payload provides it, after normal `HH:MM` validation only.
4. Do not subtract `+03:00`, do not convert prayer clock values into `Europe/London`, and do not shift clock values for BST/GMT.

### Stored Date

The stored `date` and each `automaticTimes.date` should come from the calendar date represented by `gregorianDateLongIso8601`, normalized to `YYYY-MM-DD`.

The offset in `gregorianDateLongIso8601` is treated as metadata for parsing/validation of the payload date, not as the timezone basis for shifting prayer clock values.

### DST Handling

BST/GMT still matter operationally for London, but not by transforming the Awqat prayer clock values inside the mapper.

Phase 2D behavior is:

- if Awqat returns `03:28`, the mapper stores `03:28`
- if Awqat returns `05:20`, the mapper stores `05:20`
- if Awqat returns `13:02`, the mapper stores `13:02`
- if Awqat returns `20:34`, the mapper stores `20:34`

The mapper must not perform timezone arithmetic on those clock values.

## Output Shape Rules

The mapper returns a full `PrayerTimesCurrent` object.

### Always Updated

These fields are always refreshed from the mapper input:

- `providerSource: "awqat-salah"`
- `method: null` unless Awqat later provides an equivalent method field
- `fetchedAt: input.fetchedAt`
- `offsets: input.current.offsets`
- `automaticTimes`

`automaticTimes` should contain the normalized Awqat-derived values:

- `date`
- `today`
- `tomorrow`

`automaticTimes.today` and `automaticTimes.tomorrow` should preserve the Awqat clock values directly, not converted values.

### When `manualOverride === false`

The mapper should mirror existing automatic-provider semantics:

- top-level `date` becomes the normalized Awqat automatic date
- top-level `today` becomes preserved Awqat today
- top-level `tomorrow` becomes preserved Awqat tomorrow
- top-level `updated_at` becomes `input.fetchedAt`
- `effectiveSource` becomes `"awqat-salah"`

### When `manualOverride === true`

The mapper must preserve existing manual-override semantics and must not force a display-source switch:

- top-level `date` stays from `input.current.date`
- top-level `today` stays from `input.current.today`
- top-level `tomorrow` stays from `input.current.tomorrow`
- top-level `updated_at` stays from `input.current.updated_at`
- `effectiveSource` stays `"manual"`
- `manualOverride` stays `true`
- `automaticTimes` is still refreshed with preserved Awqat values

This matches the current Aladhan sync contract and avoids introducing hidden source-switching behavior in a pure mapper.

## Tomorrow Handling

If a tomorrow Awqat payload is provided:

- normalize and populate `automaticTimes.tomorrow`
- when `manualOverride === false`, also populate top-level `tomorrow`

If tomorrow is not provided:

- return `automaticTimes.tomorrow: null`
- when `manualOverride === false`, top-level `tomorrow` should also be `null`

No synthetic tomorrow value should be invented in the mapper.

## Validation Expectations

The mapper should produce data that remains valid under the existing prayer-time validation rules:

- `HH:MM` format
- logical prayer ordering
- valid top-level shape

Phase 2D does not add Firestore persistence, but the mapper output should be compatible with the current validation pipeline.

## Test Design

Phase 2D tests should prove both backward compatibility and correct non-shifting time handling.

### Type / Compatibility Tests

1. Existing manual documents still normalize and validate.
2. Existing aladhan documents still normalize and validate.
3. `providerSource: "awqat-salah"` is accepted.
4. `effectiveSource: "awqat-salah"` is accepted when automatic mode is active.
5. Legacy documents without Awqat fields still parse exactly as before.

### Mapper Behavior Tests

1. Prayer clock values are preserved exactly from Awqat input without timezone shifting.
2. `gregorianDateLongIso8601` is parsed and normalized into the stored `date`.
3. A summer sample date still preserves prayer clock values exactly.
4. A winter sample date still preserves prayer clock values exactly.
5. Manual override preserves top-level effective prayer fields while refreshing `automaticTimes`.
6. Automatic mode writes preserved Awqat values into the top-level effective fields.
7. `date` is derived from `gregorianDateLongIso8601` metadata, not from ad hoc string slicing rules elsewhere.
8. `tomorrow` is mapped only when supplied.

### Representative Test Cases

At minimum, include:

- one case proving `fajr: "03:28"` remains `"03:28"`
- one case proving `sunrise: "05:20"` remains `"05:20"`
- one case proving `dhuhr: "13:02"` remains `"13:02"`
- one case proving `maghrib: "20:34"` remains `"20:34"`
- one case proving no `+03:00` to London subtraction happens
- one manual-override case using the same Awqat payload to prove effective values remain unchanged

## File Impact For Later Implementation

Expected files for implementation:

- `src/types/display.ts`
  - widen source unions narrowly
- `src/utils/prayerTimeDocument.ts`
  - accept `"awqat-salah"` during normalization while preserving legacy compatibility
- new pure mapper file under `scripts/prayerTimes/` or `src/utils/`
  - preferred location should be chosen based on whether the team wants mapper reuse on both script and app sides
- new mapper tests under `tests/`

Phase 2D itself remains design-only. No runtime integration is included in this spec.
