import test from "node:test";
import assert from "node:assert/strict";

import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import { FIRESTORE_PATHS } from "../src/shared/firestorePaths.ts";
import { runPrayerTimeSync } from "../functions/src/prayerTimeSyncService.ts";

const providerResult = {
  providerSource: "aladhan" as const,
  method: 13,
  fetchedAt: "2026-05-02T03:40:00.000Z",
  offsets: {
    fajr: 1,
    sunrise: 0,
    dhuhr: 0,
    asr: 2,
    maghrib: 0,
    isha: -1,
  },
  automaticTimes: {
    date: "2026-05-02" as const,
    today: {
      fajr: "04:32",
      sunrise: "05:17",
      dhuhr: "12:56",
      asr: "16:45",
      maghrib: "20:22",
      isha: "21:49",
    },
    tomorrow: {
      fajr: "04:30",
      sunrise: "05:15",
      dhuhr: "12:56",
      asr: "16:46",
      maghrib: "20:24",
      isha: "21:51",
    },
  },
};

function createFakeDb(initialValue: unknown) {
  const state = {
    paths: [] as string[],
    value: initialValue,
    writes: [] as unknown[],
  };

  return {
    db: {
      doc(path: string) {
        state.paths.push(path);

        return {
          async get() {
            return {
              data: () => state.value,
              exists: state.value != null,
            };
          },
          async set(value: unknown) {
            state.value = value;
            state.writes.push(value);
          },
        };
      },
    } as never,
    state,
  };
}

test("runPrayerTimeSync writes prayerTimes/current and logs success when manualOverride is false", async () => {
  const infoLogs: string[] = [];
  const errorLogs: string[] = [];
  const { db, state } = createFakeDb({
    ...mockDisplayData.prayerTimes,
    manualOverride: false,
    effectiveSource: "manual",
    providerSource: null,
    method: null,
    fetchedAt: null,
    automaticTimes: null,
  });

  const result = await runPrayerTimeSync({
    db,
    fetchProviderResult: async () => providerResult,
    logError(message, error) {
      errorLogs.push(`${message}:${error instanceof Error ? error.message : String(error)}`);
    },
    logInfo(message) {
      infoLogs.push(message);
    },
  });

  assert.equal(result.effectiveSource, "aladhan");
  assert.equal(result.today.fajr, "04:32");
  assert.equal(state.writes.length, 1);
  assert.equal((state.writes[0] as typeof result).today.fajr, "04:32");
  assert.deepEqual([...new Set(state.paths)], [FIRESTORE_PATHS.prayerTimesCurrent]);
  assert.deepEqual(errorLogs, []);
  assert.match(
    infoLogs[0] ?? "",
    /Prayer times synced to prayerTimes\/current from aladhan with effective source aladhan\./,
  );
});

test("runPrayerTimeSync performs no writes and logs a clear error when the provider fails", async () => {
  const infoLogs: string[] = [];
  const errorLogs: string[] = [];
  const { db, state } = createFakeDb(mockDisplayData.prayerTimes);

  await assert.rejects(
    () =>
      runPrayerTimeSync({
        db,
        fetchProviderResult: async () => {
          throw new Error("aladhan-unavailable");
        },
        logError(message, error) {
          errorLogs.push(`${message}:${error instanceof Error ? error.message : String(error)}`);
        },
        logInfo(message) {
          infoLogs.push(message);
        },
      }),
    /aladhan-unavailable/,
  );

  assert.equal(state.writes.length, 0);
  assert.deepEqual(infoLogs, []);
  assert.deepEqual(errorLogs, ["Aladhan prayer time sync failed.:aladhan-unavailable"]);
});

test("runPrayerTimeSync normalizes a REST-style target path before calling Firestore doc()", async () => {
  const infoLogs: string[] = [];
  const { db, state } = createFakeDb({
    ...mockDisplayData.prayerTimes,
    manualOverride: false,
    effectiveSource: "manual",
    providerSource: null,
    method: null,
    fetchedAt: null,
    automaticTimes: null,
  });

  await runPrayerTimeSync({
    db,
    fetchProviderResult: async () => providerResult,
    logInfo(message) {
      infoLogs.push(message);
    },
    targetPath: "projects/icmg-tvapp/databases/(default)/documents/prayerTimes/current",
  });

  assert.deepEqual([...new Set(state.paths)], [FIRESTORE_PATHS.prayerTimesCurrent]);
  assert.match(infoLogs[0] ?? "", /Prayer times synced to prayerTimes\/current/);
});
