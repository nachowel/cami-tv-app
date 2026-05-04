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

function assertNoRestStyleFirestorePath(path: string) {
  assert.doesNotMatch(path, /projects\//);
  assert.doesNotMatch(path, /databases\/\(default\)/);
  assert.doesNotMatch(path, /\/documents\//);
}

function createFakeDb(initialDocs: Record<string, unknown>) {
  const state = {
    docs: { ...initialDocs },
    paths: [] as string[],
    writes: [] as Array<{ path: string; value: unknown }>,
  };

  return {
    db: {
      doc(path: string) {
        state.paths.push(path);

        return {
          async get() {
            return {
              data: () => state.docs[path],
              exists: state.docs[path] != null,
            };
          },
          async set(value: unknown) {
            state.docs[path] = value;
            state.writes.push({ path, value });
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
    [FIRESTORE_PATHS.prayerTimesCurrent]: {
      ...mockDisplayData.prayerTimes,
      manualOverride: false,
      effectiveSource: "manual",
      providerSource: null,
      method: null,
      fetchedAt: null,
      automaticTimes: null,
    },
    [FIRESTORE_PATHS.settingsPrayerTimes]: {
      source: "aladhan",
    },
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
  assert.equal((state.writes[0]?.value as typeof result).today.fajr, "04:32");
  assert.deepEqual([...new Set(state.paths)], [FIRESTORE_PATHS.settingsPrayerTimes, FIRESTORE_PATHS.prayerTimesCurrent]);
  for (const path of state.paths) {
    assertNoRestStyleFirestorePath(path);
  }
  assert.deepEqual(errorLogs, []);
  assert.match(
    infoLogs[0] ?? "",
    /Prayer times synced to prayerTimes\/current from aladhan/,
  );
});

test("runPrayerTimeSync performs no writes and logs a clear error when the provider fails", async () => {
  const infoLogs: string[] = [];
  const errorLogs: string[] = [];
  const { db, state } = createFakeDb({
    [FIRESTORE_PATHS.prayerTimesCurrent]: mockDisplayData.prayerTimes,
    [FIRESTORE_PATHS.settingsPrayerTimes]: {
      source: "aladhan",
    },
  });

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

test("runPrayerTimeSync always uses prayerTimes/current before calling Firestore doc()", async () => {
  const infoLogs: string[] = [];
  const { db, state } = createFakeDb({
    [FIRESTORE_PATHS.prayerTimesCurrent]: {
      ...mockDisplayData.prayerTimes,
      manualOverride: false,
      effectiveSource: "manual",
      providerSource: null,
      method: null,
      fetchedAt: null,
      automaticTimes: null,
    },
    [FIRESTORE_PATHS.settingsPrayerTimes]: {
      source: "aladhan",
    },
  });

  await runPrayerTimeSync({
    db,
    fetchProviderResult: async () => providerResult,
    logInfo(message) {
      infoLogs.push(message);
    },
  });

  assert.deepEqual([...new Set(state.paths)], [FIRESTORE_PATHS.settingsPrayerTimes, FIRESTORE_PATHS.prayerTimesCurrent]);
  for (const path of state.paths) {
    assertNoRestStyleFirestorePath(path);
  }
  assert.match(infoLogs[0] ?? "", /Prayer times synced to prayerTimes\/current/);
});

test("runPrayerTimeSync defaults missing settings/prayerTimes to manual and skips without writing", async () => {
  const infoLogs: string[] = [];
  let providerCalls = 0;
  const { db, state } = createFakeDb({
    [FIRESTORE_PATHS.prayerTimesCurrent]: mockDisplayData.prayerTimes,
  });

  const result = await runPrayerTimeSync({
    db,
    fetchProviderResult: async () => {
      providerCalls += 1;
      return providerResult;
    },
    logInfo(message) {
      infoLogs.push(message);
    },
  });

  assert.equal(providerCalls, 0);
  assert.equal(state.writes.length, 0);
  assert.equal(result.today.fajr, mockDisplayData.prayerTimes.today.fajr);
  assert.ok(
    infoLogs.some(
      (message) =>
        message ===
        "Prayer time sync skipped because settings/prayerTimes source is manual.",
    ),
  );
});

test("runPrayerTimeSync exits without writing when source is awqat-salah", async () => {
  const infoLogs: string[] = [];
  let providerCalls = 0;
  const { db, state } = createFakeDb({
    [FIRESTORE_PATHS.prayerTimesCurrent]: mockDisplayData.prayerTimes,
    [FIRESTORE_PATHS.settingsPrayerTimes]: {
      source: "awqat-salah",
    },
  });

  const result = await runPrayerTimeSync({
    db,
    fetchProviderResult: async () => {
      providerCalls += 1;
      return providerResult;
    },
    logInfo(message) {
      infoLogs.push(message);
    },
  });

  assert.equal(providerCalls, 0);
  assert.equal(state.writes.length, 0);
  assert.equal(result.today.fajr, mockDisplayData.prayerTimes.today.fajr);
  assert.match(infoLogs[0] ?? "", /awqat-salah/);
  assert.match(infoLogs[0] ?? "", /skipped/i);
});

test("runPrayerTimeSync skips aladhan overwrite when a fresh awqat document already exists", async () => {
  const infoLogs: string[] = [];
  let providerCalls = 0;
  const { db, state } = createFakeDb({
    [FIRESTORE_PATHS.prayerTimesCurrent]: {
      ...mockDisplayData.prayerTimes,
      manualOverride: false,
      effectiveSource: "awqat-salah",
      providerSource: "awqat-salah",
      provider: "awqat",
      source: "awqat",
      updated_at: "2026-05-04T11:30:00.000Z",
      updatedAt: "2026-05-04T11:30:00.000Z",
      fetchedAt: "2026-05-04T11:30:00.000Z",
    },
    [FIRESTORE_PATHS.settingsPrayerTimes]: {
      source: "aladhan",
    },
  });

  const result = await runPrayerTimeSync({
    db,
    now: new Date("2026-05-04T12:00:00.000Z"),
    fetchProviderResult: async () => {
      providerCalls += 1;
      return providerResult;
    },
    logInfo(message) {
      infoLogs.push(message);
    },
  });

  assert.equal(providerCalls, 0);
  assert.equal(state.writes.length, 0);
  assert.equal(result.provider, "awqat");
  assert.ok(infoLogs.some((message) => /fresh awqat/i.test(message)));
  assert.ok(infoLogs.some((message) => /skip/i.test(message)));
});
