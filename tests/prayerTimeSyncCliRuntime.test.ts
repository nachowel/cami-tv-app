import test from "node:test";
import assert from "node:assert/strict";

import { mockDisplayData } from "../src/data/mockDisplayData.ts";
import { runProductionPrayerTimeSync } from "../scripts/prayerTimes/syncPrayerTimesRuntime.ts";

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

function assertNoRestStyleFirestorePath(path: string) {
  assert.doesNotMatch(path, /projects\//);
  assert.doesNotMatch(path, /databases\/\(default\)/);
  assert.doesNotMatch(path, /\/documents\//);
}

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

test("production prayer sync runtime logs the fixed SDK doc path and ignores REST-style env path values", async () => {
  const logs: string[] = [];
  const { db, state } = createFakeDb({
    ...mockDisplayData.prayerTimes,
    manualOverride: false,
    effectiveSource: "manual",
    providerSource: null,
    method: null,
    fetchedAt: null,
    automaticTimes: null,
  });

  await runProductionPrayerTimeSync({
    db,
    env: {
      PRAYER_SYNC_TARGET_PATH: "projects/test-project/databases/(default)/documents/prayerTimes/current",
      FIREBASE_PROJECT_ID: "projects/test-project/databases/(default)",
    },
    fetchProviderResult: async () => providerResult,
    logError(message, error) {
      logs.push(`${message}:${error instanceof Error ? error.message : String(error)}`);
    },
    logInfo(message) {
      logs.push(message);
    },
  });

  assert.deepEqual([...new Set(state.paths)], ["prayerTimes/current"]);
  for (const path of state.paths) {
    assertNoRestStyleFirestorePath(path);
  }
  assert.deepEqual(logs.slice(0, 3), [
    "SYNC_RUNTIME_ENTRY: scripts/prayerTimes/syncPrayerTimes.ts",
    "SYNC_DOC_PATH: prayerTimes/current",
    "SYNC_ENV_TARGET_PATH: projects/test-project/databases/(default)/documents/prayerTimes/current",
  ]);
  assert.equal(logs.at(-1), "Prayer times synced to prayerTimes/current from aladhan");
});
