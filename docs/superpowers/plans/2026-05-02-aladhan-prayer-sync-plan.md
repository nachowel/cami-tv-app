# Aladhan Prayer Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Aladhan-backed prayer time sync that writes to `prayerTimes/current` in Firestore while preserving manual admin prayer times until manual override is explicitly disabled.

**Architecture:** Keep `/tv` reading only the existing top-level effective prayer time fields, and extend the Firestore prayer-time document with provider metadata, `automaticTimes`, `manualOverride`, and offsets. Implement provider fetch/normalize logic in isolated server-side modules, then merge those results into Firestore through a separate sync layer that enforces safe-write rules and backward compatibility.

**Tech Stack:** TypeScript, Node `fetch`, Firebase Firestore, Firebase Admin SDK scripts, React admin UI, Node test runner

---

## File Structure

**Modify**
- `src/types/display.ts`
  - Expand `PrayerTimesCurrent` with `effectiveSource`, `providerSource`, `method`, `fetchedAt`, `manualOverride`, `offsets`, and `automaticTimes`.
- `src/data/mockDisplayData.ts`
  - Add safe default prayer-time metadata for fallback data.
- `src/services/firestoreDisplayService.ts`
  - Normalize rich prayer-time documents and backfill missing fields from legacy documents.
- `src/routes/AdminPanel.tsx`
  - Preserve `automaticTimes` and metadata on manual save, and add the manual override switch behavior.
- `src/components/admin/PrayerTimesSection.tsx`
  - Add the manual override toggle and legacy-safe source/status context without redesigning the page.
- `src/utils/prayerTimes.ts`
  - Keep next-prayer logic working with the expanded `PrayerTimesCurrent` shape.
- `package.json`
  - Add a sync script entry for the Aladhan prayer sync worker.

**Create**
- `src/utils/prayerTimeDocument.ts`
  - Shared document normalization and merge helpers for backward compatibility and admin restore behavior.
- `scripts/prayerTimes/prayerTimeProviderTypes.ts`
  - Provider-facing normalized types and offset config types.
- `scripts/prayerTimes/aladhanProvider.ts`
  - Fetch Aladhan data, strip suffixes, normalize times, and apply offsets.
- `scripts/prayerTimes/prayerTimeSyncShared.ts`
  - Merge provider results into the current Firestore document with safe-write rules.
- `scripts/prayerTimes/syncPrayerTimes.ts`
  - CLI entry point that reads Firestore, runs the provider, and writes only on full success.
- `tests/prayerTimeDocument.test.ts`
  - Backward compatibility and manual override merge behavior.
- `tests/aladhanProvider.test.ts`
  - Provider normalization, `HH:mm` cleanup, and offset application.
- `tests/prayerTimeSyncShared.test.ts`
  - Safe-write sync behavior, including fetch failure and restore from `automaticTimes`.

**Existing Tests to Update**
- `tests/firestoreDisplayService.test.ts`
- `tests/prayerTimes.test.ts`
- `tests/adminFirestoreState.test.ts`

## Task 1: Expand the Prayer Time Document Safely

**Files:**
- Create: `src/utils/prayerTimeDocument.ts`
- Modify: `src/types/display.ts`
- Modify: `src/data/mockDisplayData.ts`
- Modify: `src/services/firestoreDisplayService.ts`
- Test: `tests/prayerTimeDocument.test.ts`
- Test: `tests/firestoreDisplayService.test.ts`

- [ ] **Step 1: Write the failing backward-compatibility tests**

Add `tests/prayerTimeDocument.test.ts` with these cases:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import {
  normalizePrayerTimesCurrent,
  restoreEffectivePrayerTimesFromAutomatic,
} from "../src/utils/prayerTimeDocument.ts";

test("normalizePrayerTimesCurrent protects legacy documents by default", () => {
  const result = normalizePrayerTimesCurrent({
    date: "2026-05-01",
    today: mockDisplayData.prayerTimes.today,
    tomorrow: null,
    updated_at: "2026-05-01T18:00:00Z",
  });

  assert.equal(result.manualOverride, true);
  assert.equal(result.effectiveSource, "manual");
  assert.equal(result.providerSource, null);
  assert.deepEqual(result.offsets, {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  });
  assert.equal(result.automaticTimes, null);
});

test("restoreEffectivePrayerTimesFromAutomatic copies automatic times immediately when available", () => {
  const result = restoreEffectivePrayerTimesFromAutomatic({
    ...mockDisplayData.prayerTimes,
    manualOverride: true,
    effectiveSource: "manual",
    automaticTimes: {
      date: "2026-05-02",
      today: {
        fajr: "04:55",
        sunrise: "05:33",
        dhuhr: "12:58",
        asr: "16:42",
        maghrib: "20:18",
        isha: "21:41",
      },
      tomorrow: null,
    },
  }, "2026-05-02T19:00:00.000Z");

  assert.equal(result.manualOverride, false);
  assert.equal(result.effectiveSource, "aladhan");
  assert.equal(result.date, "2026-05-02");
  assert.equal(result.today.fajr, "04:55");
  assert.equal(result.updated_at, "2026-05-02T19:00:00.000Z");
});
```

Update `tests/firestoreDisplayService.test.ts` with a legacy Firestore read case:

```ts
test("createFirestoreReadWriteClient normalizes older prayer time Firestore fields safely", async () => {
  const client = createFirestoreReadWriteClient(
    {
      collection() { throw new Error("collection not used"); },
      deleteDoc: async () => {},
      doc(_db, path) { return { path }; },
      getDoc: async () => ({
        data: () => ({
          date: "2026-05-01",
          today: mockDisplayData.prayerTimes.today,
          tomorrow: null,
          updated_at: "2026-05-01T18:00:00Z",
        }),
        exists: () => true,
      }),
      getDocs: async () => ({ docs: [] }),
      orderBy() { throw new Error("orderBy not used"); },
      query() { throw new Error("query not used"); },
      setDoc: async () => {},
    },
    {} as never,
  );

  const result = await client.fetchPrayerTimesCurrent();

  assert.equal(result?.manualOverride, true);
  assert.equal(result?.effectiveSource, "manual");
  assert.equal(result?.providerSource, null);
});
```

This legacy default is intentional. Do not add any automatic migration that flips these records
to `manualOverride = false` during sync or startup.

- [ ] **Step 2: Run the new tests to verify they fail**

Run:

```bash
node --experimental-strip-types --test tests/prayerTimeDocument.test.ts tests/firestoreDisplayService.test.ts
```

Expected:
- `ERR_MODULE_NOT_FOUND` for `src/utils/prayerTimeDocument.ts`, or
- assertion failures for missing `manualOverride`, `effectiveSource`, `providerSource`, `offsets`, and `automaticTimes`

- [ ] **Step 3: Implement the document types and normalization helpers**

Update `src/types/display.ts`:

```ts
export type PrayerTimeSource = "aladhan" | "manual";

export interface PrayerTimeOffsets {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export interface PrayerTimesAutomaticSnapshot {
  date: IsoDate;
  today: PrayerTimesForDay;
  tomorrow: PrayerTimesForDay | null;
}

export interface PrayerTimesCurrent {
  date: IsoDate;
  today: PrayerTimesForDay;
  tomorrow: PrayerTimesForDay | null;
  updated_at: IsoDateTime;
  effectiveSource: PrayerTimeSource;
  providerSource: "aladhan" | null;
  method: number | null;
  fetchedAt: IsoDateTime | null;
  manualOverride: boolean;
  offsets: PrayerTimeOffsets;
  automaticTimes: PrayerTimesAutomaticSnapshot | null;
}
```

Create `src/utils/prayerTimeDocument.ts`:

```ts
import type {
  PrayerTimeOffsets,
  PrayerTimesAutomaticSnapshot,
  PrayerTimesCurrent,
  PrayerTimesForDay,
} from "../types/display.ts";

const DEFAULT_OFFSETS: PrayerTimeOffsets = {
  fajr: 0,
  sunrise: 0,
  dhuhr: 0,
  asr: 0,
  maghrib: 0,
  isha: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizePrayerTimesForDay(value: unknown, fallback: PrayerTimesForDay): PrayerTimesForDay {
  const record = isRecord(value) ? value : {};
  return {
    fajr: readString(record.fajr) || fallback.fajr,
    sunrise: readString(record.sunrise) || fallback.sunrise,
    dhuhr: readString(record.dhuhr) || fallback.dhuhr,
    asr: readString(record.asr) || fallback.asr,
    maghrib: readString(record.maghrib) || fallback.maghrib,
    isha: readString(record.isha) || fallback.isha,
  };
}

export function normalizePrayerTimesCurrent(value: unknown, fallback?: PrayerTimesCurrent): PrayerTimesCurrent {
  const base = fallback;
  const record = isRecord(value) ? value : {};
  const effectiveFallback = base?.today ?? {
    fajr: "00:00",
    sunrise: "00:00",
    dhuhr: "00:00",
    asr: "00:00",
    maghrib: "00:00",
    isha: "00:00",
  };
  const automaticRecord = isRecord(record.automaticTimes) ? record.automaticTimes : null;

  return {
    date: readString(record.date) || base?.date || "1970-01-01",
    today: normalizePrayerTimesForDay(record.today, effectiveFallback),
    tomorrow: automaticRecord || isRecord(record.tomorrow)
      ? normalizePrayerTimesForDay(record.tomorrow, base?.tomorrow ?? effectiveFallback)
      : base?.tomorrow ?? null,
    updated_at: readString(record.updated_at) || base?.updated_at || new Date(0).toISOString(),
    effectiveSource: record.effectiveSource === "aladhan" ? "aladhan" : "manual",
    providerSource: record.providerSource === "aladhan" ? "aladhan" : null,
    method: typeof record.method === "number" ? record.method : null,
    fetchedAt: readString(record.fetchedAt) || null,
    manualOverride: typeof record.manualOverride === "boolean" ? record.manualOverride : true,
    offsets: {
      fajr: readNumber(isRecord(record.offsets) ? record.offsets.fajr : undefined, 0),
      sunrise: readNumber(isRecord(record.offsets) ? record.offsets.sunrise : undefined, 0),
      dhuhr: readNumber(isRecord(record.offsets) ? record.offsets.dhuhr : undefined, 0),
      asr: readNumber(isRecord(record.offsets) ? record.offsets.asr : undefined, 0),
      maghrib: readNumber(isRecord(record.offsets) ? record.offsets.maghrib : undefined, 0),
      isha: readNumber(isRecord(record.offsets) ? record.offsets.isha : undefined, 0),
    },
    automaticTimes: automaticRecord
      ? {
          date: readString(automaticRecord.date) as PrayerTimesAutomaticSnapshot["date"],
          today: normalizePrayerTimesForDay(automaticRecord.today, effectiveFallback),
          tomorrow: isRecord(automaticRecord.tomorrow)
            ? normalizePrayerTimesForDay(automaticRecord.tomorrow, base?.tomorrow ?? effectiveFallback)
            : null,
        }
      : null,
  };
}

export function restoreEffectivePrayerTimesFromAutomatic(
  current: PrayerTimesCurrent,
  updatedAt: string,
): PrayerTimesCurrent {
  if (!current.automaticTimes) {
    return {
      ...current,
      manualOverride: false,
    };
  }

  return {
    ...current,
    date: current.automaticTimes.date,
    today: current.automaticTimes.today,
    tomorrow: current.automaticTimes.tomorrow,
    updated_at: updatedAt,
    effectiveSource: "aladhan",
    manualOverride: false,
  };
}
```

Update `src/services/firestoreDisplayService.ts` fetch and subscribe paths:

```ts
import { normalizePrayerTimesCurrent } from "../utils/prayerTimeDocument.ts";

async fetchPrayerTimesCurrent() {
  return executeRead<PrayerTimesCurrent | null>("fetchPrayerTimesCurrent", async () => {
    const snapshot = await api.getDoc(getPrayerTimesRef());
    const raw = readSnapshotData<unknown>(snapshot);
    return raw == null ? null : normalizePrayerTimesCurrent(raw);
  });
}
```

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run:

```bash
node --experimental-strip-types --test tests/prayerTimeDocument.test.ts tests/firestoreDisplayService.test.ts
```

Expected:
- all tests PASS

- [ ] **Step 5: Commit the document-compatibility slice**

```bash
git add src/types/display.ts src/data/mockDisplayData.ts src/utils/prayerTimeDocument.ts src/services/firestoreDisplayService.ts tests/prayerTimeDocument.test.ts tests/firestoreDisplayService.test.ts
git commit -m "feat: normalize prayer time documents for sync metadata"
```

## Task 2: Add the Provider Abstraction and Aladhan Normalization

**Files:**
- Create: `scripts/prayerTimes/prayerTimeProviderTypes.ts`
- Create: `scripts/prayerTimes/aladhanProvider.ts`
- Test: `tests/aladhanProvider.test.ts`

- [ ] **Step 1: Write the failing provider tests**

Create `tests/aladhanProvider.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import {
  applyPrayerTimeOffsets,
  extractCleanTime,
  normalizeAladhanResponse,
} from "../scripts/prayerTimes/aladhanProvider.ts";

test("extractCleanTime strips timezone suffixes and annotations", () => {
  assert.equal(extractCleanTime("04:31 (+01)"), "04:31");
  assert.equal(extractCleanTime("18:47 (BST)"), "18:47");
  assert.equal(extractCleanTime("05:09"), "05:09");
});

test("applyPrayerTimeOffsets shifts each prayer by the configured minutes", () => {
  const result = applyPrayerTimeOffsets(
    {
      fajr: "04:30",
      sunrise: "05:15",
      dhuhr: "12:45",
      asr: "16:30",
      maghrib: "20:10",
      isha: "21:40",
    },
    {
      fajr: 2,
      sunrise: 0,
      dhuhr: -1,
      asr: 3,
      maghrib: 0,
      isha: -5,
    },
  );

  assert.deepEqual(result, {
    fajr: "04:32",
    sunrise: "05:15",
    dhuhr: "12:44",
    asr: "16:33",
    maghrib: "20:10",
    isha: "21:35",
  });
});

test("normalizeAladhanResponse maps provider data into the internal automatic snapshot", () => {
  const result = normalizeAladhanResponse({
    todayResponse: {
      data: {
        date: { gregorian: { date: "02-05-2026" } },
        timings: {
          Fajr: "04:31 (+01)",
          Sunrise: "05:17 (+01)",
          Dhuhr: "12:56 (+01)",
          Asr: "16:43 (+01)",
          Maghrib: "20:22 (+01)",
          Isha: "21:50 (+01)",
        },
      },
    },
    tomorrowResponse: {
      data: {
        date: { gregorian: { date: "03-05-2026" } },
        timings: {
          Fajr: "04:29 (+01)",
          Sunrise: "05:15 (+01)",
          Dhuhr: "12:56 (+01)",
          Asr: "16:44 (+01)",
          Maghrib: "20:24 (+01)",
          Isha: "21:52 (+01)",
        },
      },
    },
    fetchedAt: "2026-05-02T03:40:00.000Z",
    method: 13,
    offsets: {
      fajr: 0,
      sunrise: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    },
  });

  assert.equal(result.providerSource, "aladhan");
  assert.equal(result.method, 13);
  assert.equal(result.fetchedAt, "2026-05-02T03:40:00.000Z");
  assert.equal(result.automaticTimes.date, "2026-05-02");
  assert.equal(result.automaticTimes.today.fajr, "04:31");
  assert.equal(result.automaticTimes.tomorrow?.maghrib, "20:24");
});
```

- [ ] **Step 2: Run the provider tests to verify they fail**

Run:

```bash
node --experimental-strip-types --test tests/aladhanProvider.test.ts
```

Expected:
- `ERR_MODULE_NOT_FOUND` for `scripts/prayerTimes/aladhanProvider.ts`

- [ ] **Step 3: Implement a modular provider interface and the Aladhan normalizer**

Create `scripts/prayerTimes/prayerTimeProviderTypes.ts`:

```ts
import type { PrayerTimeOffsets, PrayerTimesAutomaticSnapshot, PrayerTimesForDay } from "../../src/types/display.ts";

export interface PrayerTimeProviderConfig {
  city: string;
  country: string;
  timezone: string;
  method: number;
}

export interface PrayerTimeProviderResult {
  providerSource: "aladhan";
  method: number;
  fetchedAt: string;
  offsets: PrayerTimeOffsets;
  automaticTimes: PrayerTimesAutomaticSnapshot;
}

export interface PrayerTimeProvider {
  fetchAutomaticTimes(config: PrayerTimeProviderConfig, offsets: PrayerTimeOffsets, fetchImpl?: typeof fetch): Promise<PrayerTimeProviderResult>;
}

export type PrayerTimesDayRecord = PrayerTimesForDay;
```

Create `scripts/prayerTimes/aladhanProvider.ts`:

```ts
import type { PrayerTimeOffsets, PrayerTimesForDay } from "../../src/types/display.ts";
import type { PrayerTimeProviderConfig, PrayerTimeProviderResult } from "./prayerTimeProviderTypes.ts";

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function extractCleanTime(value: string) {
  const match = value.match(/^(\d{1,2}:\d{2})/);
  if (!match) {
    throw new Error(`Invalid Aladhan time: ${value}`);
  }
  const [hours, minutes] = match[1].split(":").map(Number);
  return `${pad(hours)}:${pad(minutes)}`;
}

function shiftTime(value: string, offset: number) {
  const [hours, minutes] = value.split(":").map(Number);
  const total = (hours * 60) + minutes + offset;
  const normalized = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

export function applyPrayerTimeOffsets(times: PrayerTimesForDay, offsets: PrayerTimeOffsets): PrayerTimesForDay {
  return {
    fajr: shiftTime(times.fajr, offsets.fajr),
    sunrise: shiftTime(times.sunrise, offsets.sunrise),
    dhuhr: shiftTime(times.dhuhr, offsets.dhuhr),
    asr: shiftTime(times.asr, offsets.asr),
    maghrib: shiftTime(times.maghrib, offsets.maghrib),
    isha: shiftTime(times.isha, offsets.isha),
  };
}

function toIsoDate(gregorianDate: string) {
  const [day, month, year] = gregorianDate.split("-");
  return `${year}-${month}-${day}`;
}

function normalizeAladhanDay(timings: Record<string, string>) {
  return {
    fajr: extractCleanTime(timings.Fajr),
    sunrise: extractCleanTime(timings.Sunrise),
    dhuhr: extractCleanTime(timings.Dhuhr),
    asr: extractCleanTime(timings.Asr),
    maghrib: extractCleanTime(timings.Maghrib),
    isha: extractCleanTime(timings.Isha),
  };
}

export function normalizeAladhanResponse(input: {
  todayResponse: { data: { date: { gregorian: { date: string } }; timings: Record<string, string> } };
  tomorrowResponse: { data: { date: { gregorian: { date: string } }; timings: Record<string, string> } };
  fetchedAt: string;
  method: number;
  offsets: PrayerTimeOffsets;
}): PrayerTimeProviderResult {
  const today = applyPrayerTimeOffsets(normalizeAladhanDay(input.todayResponse.data.timings), input.offsets);
  const tomorrow = applyPrayerTimeOffsets(normalizeAladhanDay(input.tomorrowResponse.data.timings), input.offsets);

  return {
    providerSource: "aladhan",
    method: input.method,
    fetchedAt: input.fetchedAt,
    offsets: input.offsets,
    automaticTimes: {
      date: toIsoDate(input.todayResponse.data.date.gregorian.date),
      today,
      tomorrow,
    },
  };
}
```

- [ ] **Step 4: Run the provider tests to verify they pass**

Run:

```bash
node --experimental-strip-types --test tests/aladhanProvider.test.ts
```

Expected:
- all tests PASS

- [ ] **Step 5: Commit the provider slice**

```bash
git add scripts/prayerTimes/prayerTimeProviderTypes.ts scripts/prayerTimes/aladhanProvider.ts tests/aladhanProvider.test.ts
git commit -m "feat: add modular aladhan prayer time provider"
```

## Task 3: Build the Safe Sync Merge and No-Partial-Write Flow

**Files:**
- Create: `scripts/prayerTimes/prayerTimeSyncShared.ts`
- Create: `scripts/prayerTimes/syncPrayerTimes.ts`
- Modify: `package.json`
- Test: `tests/prayerTimeSyncShared.test.ts`

- [ ] **Step 1: Write the failing sync tests**

Create `tests/prayerTimeSyncShared.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import {
  applySuccessfulProviderSync,
  createPrayerTimeSyncRunner,
} from "../scripts/prayerTimes/prayerTimeSyncShared.ts";

test("applySuccessfulProviderSync updates top-level effective fields when manualOverride is false", () => {
  const result = applySuccessfulProviderSync(
    {
      ...mockDisplayData.prayerTimes,
      manualOverride: false,
      effectiveSource: "manual",
      providerSource: null,
      fetchedAt: null,
      method: null,
      offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      automaticTimes: null,
    },
    {
      providerSource: "aladhan",
      method: 13,
      fetchedAt: "2026-05-02T03:40:00.000Z",
      offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      automaticTimes: {
        date: "2026-05-02",
        today: {
          fajr: "04:31",
          sunrise: "05:17",
          dhuhr: "12:56",
          asr: "16:43",
          maghrib: "20:22",
          isha: "21:50",
        },
        tomorrow: null,
      },
    },
    "2026-05-02T03:40:00.000Z",
  );

  assert.equal(result.effectiveSource, "aladhan");
  assert.equal(result.date, "2026-05-02");
  assert.equal(result.today.fajr, "04:31");
});

test("applySuccessfulProviderSync preserves top-level manual values when manualOverride is true", () => {
  const result = applySuccessfulProviderSync(
    {
      ...mockDisplayData.prayerTimes,
      manualOverride: true,
      effectiveSource: "manual",
      providerSource: null,
      fetchedAt: null,
      method: null,
      offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      automaticTimes: null,
    },
    {
      providerSource: "aladhan",
      method: 13,
      fetchedAt: "2026-05-02T03:40:00.000Z",
      offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      automaticTimes: {
        date: "2026-05-02",
        today: {
          fajr: "04:31",
          sunrise: "05:17",
          dhuhr: "12:56",
          asr: "16:43",
          maghrib: "20:22",
          isha: "21:50",
        },
        tomorrow: null,
      },
    },
    "2026-05-02T03:40:00.000Z",
  );

  assert.equal(result.effectiveSource, "manual");
  assert.equal(result.today.fajr, mockDisplayData.prayerTimes.today.fajr);
  assert.equal(result.automaticTimes?.today.fajr, "04:31");
});

test("sync runner does not write partial data when provider fetch fails", async () => {
  let writeCalls = 0;
  const runner = createPrayerTimeSyncRunner({
    fetchCurrent: async () => ({
      ...mockDisplayData.prayerTimes,
      manualOverride: false,
      effectiveSource: "manual",
      providerSource: null,
      fetchedAt: null,
      method: null,
      offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      automaticTimes: null,
    }),
    fetchProviderResult: async () => {
      throw new Error("aladhan-unavailable");
    },
    saveCurrent: async () => {
      writeCalls += 1;
    },
    logError() {},
  });

  await assert.rejects(() => runner.run(), /aladhan-unavailable/);
  assert.equal(writeCalls, 0);
});
```

- [ ] **Step 2: Run the sync tests to verify they fail**

Run:

```bash
node --experimental-strip-types --test tests/prayerTimeSyncShared.test.ts
```

Expected:
- `ERR_MODULE_NOT_FOUND` for `scripts/prayerTimes/prayerTimeSyncShared.ts`

- [ ] **Step 3: Implement the sync merge helper and CLI runner**

Create `scripts/prayerTimes/prayerTimeSyncShared.ts`:

```ts
import { normalizePrayerTimesCurrent } from "../../src/utils/prayerTimeDocument.ts";
import type { PrayerTimesCurrent } from "../../src/types/display.ts";
import type { PrayerTimeProviderResult } from "./prayerTimeProviderTypes.ts";

export function applySuccessfulProviderSync(
  current: PrayerTimesCurrent,
  providerResult: PrayerTimeProviderResult,
  updatedAt: string,
): PrayerTimesCurrent {
  const next: PrayerTimesCurrent = {
    ...current,
    providerSource: providerResult.providerSource,
    method: providerResult.method,
    fetchedAt: providerResult.fetchedAt,
    offsets: providerResult.offsets,
    automaticTimes: providerResult.automaticTimes,
  };

  if (current.manualOverride) {
    return next;
  }

  return {
    ...next,
    date: providerResult.automaticTimes.date,
    today: providerResult.automaticTimes.today,
    tomorrow: providerResult.automaticTimes.tomorrow,
    updated_at: updatedAt,
    effectiveSource: "aladhan",
  };
}

export function createPrayerTimeSyncRunner(deps: {
  fetchCurrent: () => Promise<PrayerTimesCurrent | null>;
  fetchProviderResult: () => Promise<PrayerTimeProviderResult>;
  saveCurrent: (value: PrayerTimesCurrent) => Promise<void>;
  logError: (message: string, error: unknown) => void;
}) {
  return {
    async run() {
      const current = normalizePrayerTimesCurrent(await deps.fetchCurrent());
      try {
        const providerResult = await deps.fetchProviderResult();
        const updatedAt = providerResult.fetchedAt;
        const merged = applySuccessfulProviderSync(current, providerResult, updatedAt);
        await deps.saveCurrent(merged);
        return merged;
      } catch (error) {
        deps.logError("Aladhan prayer time sync failed.", error);
        throw error;
      }
    },
  };
}
```

Create `scripts/prayerTimes/syncPrayerTimes.ts`:

```ts
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createPrayerTimeSyncRunner } from "./prayerTimeSyncShared.ts";
import { createAladhanProvider } from "./aladhanProvider.ts";
import { normalizePrayerTimesCurrent } from "../../src/utils/prayerTimeDocument.ts";
import { FIRESTORE_PATHS } from "../../src/shared/firestorePaths.ts";

const app = getApps()[0] ?? initializeApp();
const db = getFirestore(app);

const provider = createAladhanProvider();
const offsets = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };

await createPrayerTimeSyncRunner({
  fetchCurrent: async () => {
    const snapshot = await db.doc(FIRESTORE_PATHS.prayerTimesCurrent).get();
    return snapshot.exists ? normalizePrayerTimesCurrent(snapshot.data()) : null;
  },
  fetchProviderResult: async () =>
    provider.fetchAutomaticTimes(
      { city: "London", country: "United Kingdom", timezone: "Europe/London", method: 13 },
      offsets,
    ),
  saveCurrent: async (value) => {
    await db.doc(FIRESTORE_PATHS.prayerTimesCurrent).set(value);
  },
  logError(message, error) {
    console.error(message, error);
  },
}).run();
```

Update `package.json`:

```json
"prayer-times:sync": "node --experimental-strip-types scripts/prayerTimes/syncPrayerTimes.ts"
```

- [ ] **Step 4: Run the sync tests to verify they pass**

Run:

```bash
node --experimental-strip-types --test tests/prayerTimeSyncShared.test.ts
```

Expected:
- all tests PASS

- [ ] **Step 5: Commit the sync slice**

```bash
git add scripts/prayerTimes/prayerTimeProviderTypes.ts scripts/prayerTimes/aladhanProvider.ts scripts/prayerTimes/prayerTimeSyncShared.ts scripts/prayerTimes/syncPrayerTimes.ts tests/prayerTimeSyncShared.test.ts package.json
git commit -m "feat: add safe aladhan prayer time sync runner"
```

## Task 4: Preserve Manual Override in the Admin Panel

**Files:**
- Modify: `src/routes/AdminPanel.tsx`
- Modify: `src/components/admin/PrayerTimesSection.tsx`
- Modify: `tests/adminFirestoreState.test.ts`
- Modify: `tests/prayerTimes.test.ts`

- [ ] **Step 1: Write the failing admin/manual-override tests**

Add a top-level shape assertion to `tests/prayerTimes.test.ts`:

```ts
test("getCurrentAndNextPrayer ignores sync metadata and still uses top-level effective fields", () => {
  const result = getCurrentAndNextPrayer(new Date(2026, 4, 1, 5, 30, 0), {
    ...basePrayerTimes,
    effectiveSource: "manual",
    providerSource: "aladhan",
    method: 13,
    fetchedAt: "2026-05-01T03:40:00.000Z",
    manualOverride: true,
    offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    automaticTimes: {
      date: "2026-05-01",
      today: { ...basePrayerTimes.today, fajr: "04:31" },
      tomorrow: null,
    },
  });

  assert.equal(result.nextPrayer.time, "06:44");
});
```

Add an admin fallback assertion to `tests/adminFirestoreState.test.ts`:

```ts
test("resolveAdminDisplayData keeps prayer time metadata intact when Firestore prayer times exist", () => {
  const result = resolveAdminDisplayData(
    {
      announcements: [],
      dailyContent: mockDisplayData.dailyContent,
      donation: mockDisplayData.donation,
      prayerTimes: {
        ...mockDisplayData.prayerTimes,
        effectiveSource: "manual",
        providerSource: "aladhan",
        method: 13,
        fetchedAt: "2026-05-02T03:40:00.000Z",
        manualOverride: true,
        offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
        automaticTimes: {
          date: "2026-05-02",
          today: mockDisplayData.prayerTimes.today,
          tomorrow: null,
        },
      },
      settings: mockDisplayData.settings,
      ticker: mockDisplayData.ticker,
    },
    mockDisplayData,
  );

  assert.equal(result.data.prayerTimes.manualOverride, true);
  assert.equal(result.data.prayerTimes.effectiveSource, "manual");
});
```

Add a UI-intent assertion alongside the admin prayer-time tests so legacy documents are clearly
presented as manual until an admin chooses otherwise:

```ts
test("legacy prayer time documents stay in manual mode until admin explicitly re-enables automatic sync", () => {
  const legacy = resolveAdminDisplayData(
    {
      announcements: [],
      dailyContent: mockDisplayData.dailyContent,
      donation: mockDisplayData.donation,
      prayerTimes: {
        ...mockDisplayData.prayerTimes,
        effectiveSource: "manual",
        providerSource: null,
        method: null,
        fetchedAt: null,
        manualOverride: true,
        offsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
        automaticTimes: null,
      },
      settings: mockDisplayData.settings,
      ticker: mockDisplayData.ticker,
    },
    mockDisplayData,
  );

  assert.equal(legacy.data.prayerTimes.manualOverride, true);
  assert.equal(legacy.data.prayerTimes.effectiveSource, "manual");
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
node --experimental-strip-types --test tests/prayerTimes.test.ts tests/adminFirestoreState.test.ts
```

Expected:
- TypeScript shape failures or assertion failures for missing metadata

- [ ] **Step 3: Implement manual-save precedence and the override toggle**

Update the prayer-time submit path in `src/routes/AdminPanel.tsx`:

```ts
import { restoreEffectivePrayerTimesFromAutomatic } from "../utils/prayerTimeDocument.ts";

async function handlePrayerTimesSubmit() {
  const hasPrayerTimeErrors = (Object.keys(prayerTimeValidation) as Array<keyof PrayerTimesForDay>).some(
    (key) => !prayerTimeValidation[key].valid,
  );
  if (hasPrayerTimeErrors) {
    setShowPrayerTimeErrors(true);
    updateSectionStatus("prayerTimes", null);
    return;
  }

  const nextPrayerTimesCurrent: PrayerTimesCurrent = {
    ...prayerTimesCurrent,
    today: prayerTimesDraft,
    updated_at: new Date().toISOString(),
    manualOverride: true,
    effectiveSource: "manual",
  };

  updateSectionStatus("prayerTimes", createSavingStatus("Kaydediliyor..."));
  const result = await commitAdminSectionSave({
    isAuthenticated,
    nextValue: nextPrayerTimesCurrent,
    persist: savePrayerTimesCurrent,
    successMessage: "Kaydedildi.",
  });
}

async function handlePrayerManualOverrideChange(enabled: boolean) {
  const timestamp = new Date().toISOString();
  const nextValue = enabled
    ? prayerTimesCurrent
    : restoreEffectivePrayerTimesFromAutomatic(prayerTimesCurrent, timestamp);

  updateSectionStatus("prayerTimes", createSavingStatus("Kaydediliyor..."));
  const result = await commitAdminSectionSave({
    isAuthenticated,
    nextValue: enabled
      ? { ...prayerTimesCurrent, manualOverride: true, effectiveSource: "manual" }
      : nextValue,
    persist: savePrayerTimesCurrent,
    successMessage: "Kaydedildi.",
  });
}
```

Update `src/components/admin/PrayerTimesSection.tsx`:

```tsx
interface PrayerTimesSectionProps {
  errors: Partial<Record<keyof PrayerTimesForDay, string>>;
  prayerTimes: PrayerTimesForDay;
  status: SectionStatus | null;
  manualOverride: boolean;
  effectiveSource: "aladhan" | "manual";
  providerSource: "aladhan" | null;
  onManualOverrideChange: (enabled: boolean) => void;
  onChange: (nextPrayerTimes: PrayerTimesForDay) => void;
  onSubmit: () => void;
}

<div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
  <label className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-semibold text-slate-900">Manuel geçersiz kılma</p>
      <p className="mt-1 text-sm text-slate-600">
        {manualOverride
          ? "Açık. TV şu anda yönetim panelindeki manuel vakitleri gösterir."
          : "Kapalı. TV Aladhan ile senkronlanan etkili vakitleri gösterir."}
      </p>
    </div>
    <input
      checked={manualOverride}
      onChange={(event) => onManualOverrideChange(event.target.checked)}
      type="checkbox"
    />
  </label>
  <p className="mt-3 text-xs font-medium text-slate-500">
    Etkin kaynak: {effectiveSource} | Sağlayıcı: {providerSource ?? "yok"}
  </p>
  <p className="mt-2 text-xs text-slate-500">
    Eski kayıtlar güvenlik için manuel modda tutulur. Otomatik Aladhan senkronuna dönmek için bu seçeneği siz kapatmalısınız.
  </p>
</div>
```

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run:

```bash
node --experimental-strip-types --test tests/prayerTimes.test.ts tests/adminFirestoreState.test.ts
```

Expected:
- all tests PASS

- [ ] **Step 5: Commit the admin/manual slice**

```bash
git add src/routes/AdminPanel.tsx src/components/admin/PrayerTimesSection.tsx tests/prayerTimes.test.ts tests/adminFirestoreState.test.ts
git commit -m "feat: preserve manual prayer time override in admin"
```

## Task 5: Run Full Verification and Check the Backward-Compatibility Contract

**Files:**
- Review only: `docs/superpowers/specs/2026-05-02-aladhan-prayer-sync-design.md`
- Review only: `docs/superpowers/plans/2026-05-02-aladhan-prayer-sync-plan.md`

- [ ] **Step 1: Run the full unit suite**

Run:

```bash
npm run test:unit
```

Expected:
- all tests PASS

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected:
- successful TypeScript build with no errors

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected:
- Vite production build completes successfully

- [ ] **Step 4: Smoke-check the compatibility promises against the spec**

Verify these outcomes explicitly:

```text
1. Legacy prayer time documents missing manualOverride/effectiveSource/automaticTimes/offsets load without crashing.
2. Legacy documents default to manualOverride=true so the first sync cannot overwrite existing effective values unexpectedly.
2a. Legacy documents remain in manual mode until an admin explicitly disables manual override in `/admin`.
3. /tv still reads top-level date/today/tomorrow/updated_at and ignores provider internals.
4. Failed Aladhan fetch performs zero Firestore writes.
5. Disabling manual override copies automaticTimes into the effective top-level fields only when automaticTimes exists.
6. Fetch/normalize/apply-offset logic exists in provider modules rather than being hardcoded across admin/UI code.
```

- [ ] **Step 5: Commit the final verified state**

```bash
git add .
git commit -m "feat: add aladhan-backed prayer time sync with manual override"
```

## Self-Review

### Spec coverage

- Backward compatibility: covered in Task 1 normalization tests and legacy-default logic, plus Task 5 smoke-check.
- Safe write behavior: covered in Task 3 sync tests and merge helper.
- Provider abstraction: covered in Task 2 provider-specific module and Task 3 sync orchestration split.
- Manual override precedence and restore flow: covered in Task 1 restore helper and Task 4 admin toggle logic.
- `/tv` stable top-level read contract: covered in Task 4 `prayerTimes.test.ts` and Task 5 smoke-check.

### Placeholder scan

- No `TODO`, `TBD`, or “similar to” references remain.
- Every code-changing step includes explicit file paths and code blocks.
- Every verification step includes exact commands.

### Type consistency

- The plan consistently uses:
  - `effectiveSource`
  - `providerSource`
  - `manualOverride`
  - `automaticTimes`
  - `offsets`
- Provider outputs always flow through `PrayerTimeProviderResult`.
- `/tv` remains bound to the top-level `PrayerTimesCurrent` effective fields.
